const express = require('express');
const path = require('path');
const session = require('express-session');
const { connectToDatabase } = require('./mwpDB');
const { ObjectId } = require('mongodb');

const app = express();

// Middleware
app.use(express.json()); // Parse incoming JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse HTML form submissions
app.use(express.static(__dirname)); // Serve static files

// Session middleware
app.use(session({
    secret: 'mwp-secret-key',
    resave: false,
    saveUninitialized: false
}));

// PUG setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'pages'));

// DB reference (set once on startup)
let db;

// Get all services from DB
async function getAllServices() {
    return await db.collection('services').find().toArray();
}

// Get one service by numeric id field
async function getServiceById(id) {
    return await db.collection('services').findOne({ id: id });
}

// Save updated service back to DB
async function updateService(id, updatedService) {
    await db.collection('services').replaceOne({ id: id }, updatedService);
}

// Get all orders from DB
async function getAllOrders() {
    return await db.collection('orders').find().toArray();
}

// AUTH MIDDLEWARE

// Redirect to login if no active session
function isLoggedIn(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/login');
}

// Block access if user is not an admin
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.admin) return next();
    res.status(403).send('Access denied');
}

// Computes statistics for each streaming service from the database
async function computeStats() {
    const services = await getAllServices();
    const orders = await getAllOrders();

    return services.map(service => {
        // Filter orders that include this service
        const serviceOrders = orders.filter(o => o.movies && o.movies[service.name]);

        // Flatten all movies ordered from this service
        const allMovies = serviceOrders.flatMap(o => o.movies[service.name] || []);
        const totalMovies = allMovies.length;

        // Sum movie prices and service fees across all orders
        const totalRevenue = serviceOrders.reduce((sum, o) => {
            const movieTotal = (o.movies[service.name] || []).reduce((s, m) => s + m.price, 0);
            return sum + movieTotal + (o.fees[service.name] || 0);
        }, 0);

        const totalOrders = serviceOrders.length;
        const avgCost = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

        // Count how many times each movie was ordered
        const movieCount = {};
        allMovies.forEach(m => {
            movieCount[m.title] = (movieCount[m.title] || 0) + 1;
        });

        // Only consider movies that still exist in the service
        const existingTitles = Object.values(service.genres).flatMap(g => g.map(m => m.title));

        // Pick the most ordered movie that still exists
        const topMovie = Object.keys(movieCount)
            .filter(title => existingTitles.includes(title))
            .sort((a, b) => movieCount[b] - movieCount[a])[0] || 'N/A';

        return {
            name: service.name,
            totalMovies,
            totalRevenue: totalRevenue.toFixed(2),
            avgCost: avgCost.toFixed(2),
            topMovie
        };
    });
}

// ROUTES - PUBLIC

// Render home page
app.get('/', (req, res) => {
    res.render('home', { user: req.session.user });
});

// Render login page
app.get('/login', (req, res) => {
    res.render('login', { user: null });
});

// POST /login - authenticate user
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const foundUser = await db.collection('users').findOne({ username, password });

    // Re-render login with error if credentials don't match
    if (!foundUser) {
        return res.render('login', { user: null, error: 'Invalid username or password' });
    }
    // Save user info to session on successful login
    req.session.user = {
        _id: foundUser._id.toString(),
        username: foundUser.username,
        admin: foundUser.admin
    };
    res.redirect('/');
});

// Render registration page
app.get('/register', (req, res) => {
    res.render('register', { user: null });
});

// POST /register - create new user
app.post('/register', async (req, res) => {
    const { username, password, privacy } = req.body;

    // Reject registration if username is already taken
    const existing = await db.collection('users').findOne({ username });
    if (existing) {
        return res.render('register', { user: null, error: 'Username already taken' });
    }

    // Build new user document (no admin privileges)
    const newUser = {
        username: username.trim(),
        password: password.trim(),
        admin: false,
        privacy: privacy === 'on' || privacy === true
    };
    const result = await db.collection('users').insertOne(newUser);
   
    // Start session for newly registered user
    req.session.user = {
        _id: result.insertedId.toString(),
        username: newUser.username,
        admin: false
    };
    res.redirect('/');
});

// Destroy session and redirect to home
app.get('/logout', isLoggedIn, (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


// ROUTES - LOGGED IN USERS

// Render order form with basic service data
app.get('/order', isLoggedIn, async (req, res) => {
    const services = await getAllServices();
    const basicServices = services.map(s => ({
        id: s.id,
        name: s.name,
        minOrder: s.minOrder,
        serviceFee: s.serviceFee
    }));
    res.render('orderForm', { services: basicServices, user: req.session.user });
});

// Render statistics page with computed stats for all services
app.get('/stats', isLoggedIn, async (req, res) => {
    const stats = await computeStats();
    res.render('statistics', { stats, user: req.session.user });
});

// Submit order - now saves to DB with user ID
app.post('/submit-order', isLoggedIn, async (req, res) => {
    const order = req.body;
    if (!order) return res.status(400).send('Invalid order data');

    // Tag order with the current user's ID before saving
    order.user = req.session.user._id;
    await db.collection('orders').insertOne(order);

    const stats = await computeStats();
    res.render('statistics', { stats, user: req.session.user });
});

// Render profile page for a user, including their order history
app.get('/users/:uID', isLoggedIn, async (req, res) => {
    try {
        // Convert URL string ID to MongoDB ObjectId
        const uID = new ObjectId(req.params.uID);

        // Look up the user in the database
        const profileUser = await db.collection('users').findOne({ _id: uID });
        if (!profileUser) return res.status(404).send('User not found');

        // Fetch all orders belonging to this user
        const userOrders = await db.collection('orders').find({ user: req.params.uID }).toArray();

        // Render profile with user info and order history
        res.render('userProfile', {
            user: req.session.user,
            profileUser,
            orders: userOrders
        });
    } catch (e) {
        // ObjectId conversion fails if the ID format is invalid
        res.status(400).send('Invalid user ID');
    }
});

// Update username, password and privacy setting for a user
app.put('/users/:uID', isLoggedIn, async (req, res) => {
    try {
        // Convert URL string ID to MongoDB ObjectId
        const uID = new ObjectId(req.params.uID);
        const { username, password, privacy } = req.body;

        // Reject if required fields are missing
        if (!username || !password) {
            return res.status(400).send('Missing required fields');
        }

        // Apply updates to the user document in the database
        await db.collection('users').updateOne(
            { _id: uID },
            { $set: { username, password, privacy: privacy === true || privacy === 'true' } }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(400).send('Invalid user ID');
    }
});

// Return service as JSON or render serviceInfo page depending on Accept header
app.get('/services/:sID', isLoggedIn, async (req, res) => {
    // Parse service ID from URL parameter
    const sID = parseInt(req.params.sID);
    const service = await getServiceById(sID);
    if (!service) return res.status(404).send('Service not found');

    // Return raw JSON if requested
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json(service);
    }

    // Otherwise render the service info page
    res.render('serviceInfo', { service, user: req.session.user });
});


// ROUTES - ADMIN ONLY

// Return all users as JSON or render the user directory page
app.get('/users', isLoggedIn, isAdmin, async (req, res) => {
    const users = await db.collection('users').find().toArray();

    // Return id, username and privacy only (no passwords)
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json(users.map(u => ({
            id: u._id,
            username: u.username,
            privacy: u.privacy
        })));
    }
    res.render('users', { users, user: req.session.user });
});

// Delete a user from the database by their MongoDB ID
app.delete('/users/:uID', isLoggedIn, isAdmin, async (req, res) => {
    try {
        // Convert URL string ID to MongoDB ObjectId
        const uID = new ObjectId(req.params.uID);

        // Attempt to delete the user document
        const result = await db.collection('users').deleteOne({ _id: uID });

        // deletedCount is 0 if no document matched the ID
        if (result.deletedCount === 0) return res.status(404).send('User not found');
        res.json({ success: true });
    } catch (e) {
        res.status(400).send('Invalid user ID');
    }
});

// Return all services as JSON or render the services page
app.get('/services', isLoggedIn, isAdmin, async (req, res) => {
    const services = await getAllServices();

    // Return only id and name
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({
            count: services.length,
            services: services.map(s => ({ id: s.id, name: s.name }))
        });
    }
    // Render full services page for browser requests
    res.render('services', { services, user: req.session.user });
});

// Add a new streaming service to the database
app.post('/services', isLoggedIn, isAdmin, async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).send('Service name must not be blank');

    // Generate a unique ID one higher than the current maximum
    const services = await getAllServices();
    const newId = services.length > 0 ? Math.max(...services.map(s => s.id)) + 1 : 1;

    // Build new service with empty genres and zero fees
    const newService = {
        id: newId,
        name: name.trim(),
        minOrder: 0,
        serviceFee: 0,
        genres: {}
    };

    // Insert into database and return the new service data
    await db.collection('services').insertOne(newService);
    res.status(201).json({ success: true, service: newService });
});

// Delete a service and remove it from all existing orders
app.delete('/services/:sID', isLoggedIn, isAdmin, async (req, res) => {
    // Parse service ID from URL parameter
    const sID = parseInt(req.params.sID);
    const service = await getServiceById(sID);
    if (!service) return res.status(404).send('Service not found');

    // Remove the service document from the database
    await db.collection('services').deleteOne({ id: sID });

    // Strip this service's movies and fees from all orders
    await db.collection('orders').updateMany(
        {},
        // $unset removes the fields entirely from every order document
        { $unset: { [`movies.${service.name}`]: '', [`fees.${service.name}`]: '' } }
    );

    res.json({ success: true });
});

// Update name, service fee and minimum order for a service
app.put('/services/:sID', isLoggedIn, isAdmin, async (req, res) => {
    // Parse service ID from URL parameter
    const sID = parseInt(req.params.sID);
    const service = await getServiceById(sID);
    if (!service) return res.status(404).send('Service not found');

    const { name, serviceFee, minOrder } = req.body;

    // Reject if any required field is missing
    if (!name || serviceFee === undefined || minOrder === undefined) {
        return res.status(400).send('Missing required fields');
    }

    // Update only the info fields, leaving genres and movies untouched
    await db.collection('services').updateOne(
        { id: sID },
        { $set: { name: name.trim(), serviceFee: parseFloat(serviceFee), minOrder: parseFloat(minOrder) } }
    );
    res.json({ success: true });
});

// Add a new genre to a service
app.post('/services/:sID/genres', isLoggedIn, isAdmin, async (req, res) => {
    // Parse service ID from URL parameter
    const sID = parseInt(req.params.sID);
    const service = await getServiceById(sID);
    if (!service) return res.status(404).send('Service not found');

    const { genre } = req.body;

    // Reject blank genre names
    if (!genre || !genre.trim()) return res.status(400).send('Genre name must not be blank');

    // Reject duplicate genre names
    if (service.genres[genre.trim()]) return res.status(400).send('Genre already exists');

    // Add genre as an empty array ready to hold movies
    await db.collection('services').updateOne(
        { id: sID },
        // $set creates a new key in the genres object
        { $set: { [`genres.${genre.trim()}`]: [] } }
    );
    res.status(201).json({ success: true });
});

// Add a new movie to a specific genre within a service
app.post('/services/:sID/movies', isLoggedIn, isAdmin, async (req, res) => {
    // Parse service ID from URL parameter
    const sID = parseInt(req.params.sID);
    const service = await getServiceById(sID);
    if (!service) return res.status(404).send('Service not found');

    const { genre, movie } = req.body;
    
    // Reject if genre or movie data is missing
    if (!genre || !movie) return res.status(400).send('Missing genre or movie data');
    
    // Reject if the specified genre doesn't exist in this service
    if (!service.genres[genre]) return res.status(400).send('Genre does not exist in this service');

    // Flatten all movies across all services to find the highest existing I
    const allServices = await getAllServices();
    const allMovies = allServices.flatMap(s => Object.values(s.genres).flatMap(g => g));

    // Generate a unique movie ID one higher than the current maximum
    const newMovieId = allMovies.length > 0 ? Math.max(...allMovies.map(m => m.id)) + 1 : 1;

    // Build the new movie object with parsed and trimmed values
    const newMovie = {
        id: newMovieId,
        title: movie.title.trim(),
        description: movie.description.trim(),
        year: parseInt(movie.year),
        price: parseFloat(movie.price)
    };

    // Push new movie into the correct genre array
    await db.collection('services').updateOne(
        { id: sID },
        { $push: { [`genres.${genre}`]: newMovie } }
    );
    res.status(201).json({ success: true, movie: newMovie });
});

// Remove a movie from a service by searching all genres for its ID
app.delete('/services/:sID/movies/:mID', isLoggedIn, isAdmin, async (req, res) => {
    // Parse both IDs from URL parameters
    const sID = parseInt(req.params.sID);
    const mID = parseInt(req.params.mID);

    const service = await getServiceById(sID);
    if (!service) return res.status(404).send('Service not found');

    let movieFound = false;

    // Search each genre until the movie is found
    for (const genre of Object.keys(service.genres)) {
        const movie = service.genres[genre].find(m => m.id === mID);
        if (movie) {
            // Remove the movie from the genre array using $pull
            await db.collection('services').updateOne(
                { id: sID },
                { $pull: { [`genres.${genre}`]: { id: mID } } }
            );
            movieFound = true;

            // Stop searching once movie is found and deleted
            break;
        }
    }

    if (!movieFound) return res.status(404).send('Movie not found');
    res.json({ success: true });
});

// Start Server
async function startServer() {
    // Connect to MongoDB before starting the server
    db = await connectToDatabase();
    console.log('Connected to MongoDB');

    // Log DB contents on startup to confirm data is initialized
    const services = await getAllServices();
    const users = await db.collection('users').find().toArray();
    const orders = await getAllOrders();
    console.log(`Services: ${services.length}, Users: ${users.length}, Orders: ${orders.length}`);

    app.listen(3000, () => console.log('Server running on http://localhost:3000'));
}

startServer();