COMP 2406 A – Assignment 4

Student Name: Gavin Joseph
Student ID: 101348882

Overview:

This assignment builds on Assignment 3 by adding MongoDB database support,
user sessions, authentication, and authorization. All streaming service and
order data has been moved from in-memory variables to a MongoDB database.
Users can now register, log in, place orders, and view their order history.
Admins have additional privileges to manage services and users.

The application allows users to:

- Browse the home page (no login required)
- Register a new account or log in with an existing one
- Browse and order movies from streaming services (logged in users only)
- View order statistics per streaming service (logged in users only)
- View and edit their own profile including username, password and privacy (logged in users only)
- View their full order history on their profile page (logged in users only)
- View a directory of all registered users (admin only)
- Delete users from the system (admin only)
- Add, edit and delete streaming services and movies (admin only)

Files Included:

- server.js: The main Express server file. Connects to MongoDB on startup,
  handles all routes, manages sessions, enforces authentication and
  authorization middleware, and renders all pages using PUG with the
  necessary data passed in.

- mwpDB.js: Provided helper file for connecting to and disconnecting from
  the MongoDB database.

- initializeDatabase.js: Provided helper file for initializing the mwp
  database with 4 streaming services, 10 users, and an empty orders
  collection. Run this before starting the server for the first time or
  to reset the database.

- pages/home.pug: The home page served at http://localhost:3000/. Shows a
  welcome message with the logged-in user's name if applicable, and a
  button to navigate to the order form.

- pages/header.pug: A shared PUG partial included on every page. Navigation
  links change dynamically based on the user's session state. Not logged in
  shows Home and Login only. Logged in non-admin shows Home, Order Form,
  Statistics, Profile and Logout. Logged in admin also shows Users and Services.

- pages/login.pug: The login page served at http://localhost:3000/login.
  Contains username and password fields and a link to the registration page.
  Displays an error message if credentials are invalid.

- pages/register.pug: The registration page served at
  http://localhost:3000/register. Contains username, password, confirm
  password and privacy checkbox fields. Validates that passwords match
  before submitting. Displays an error message if the username is taken.


- pages/orderForm.pug: The order form page served at
  http://localhost:3000/order. Requires login to access. Basic service data
  is injected by the server on render.

- pages/statistics.pug: The statistics page served at
  http://localhost:3000/stats. Requires login to access. Fully rendered by
  the server with stats data passed in directly.

- pages/services.pug: The services page served at
  http://localhost:3000/services. Requires admin to access. Lists all
  streaming services and allows adding or deleting services.

- pages/serviceInfo.pug: The service info page served at
  http://localhost:3000/services/:sID. Requires admin to access. Allows
  editing service details, genres and movies.

- pages/users.pug: The user directory page served at
  http://localhost:3000/users. Requires admin to access. Lists all registered
  users. Private users are shown as faded and non-clickable. Admin can
  delete users from this page.

- pages/userProfile.pug: The user profile page served at
  http://localhost:3000/users/:uID. Requires login to access. Shows the
  user's account details and full order history. Users can update their
  username, password and privacy setting from this page.

- scripts/Script.js: Handles all client-side logic for the order form page.
  Uses the streamingServices data injected by the server to populate the
  dropdown. Fetches full service data when a service is selected, filters
  movies by genre, handles adding and removing movies from the order,
  calculates subtotal, service fees, tax and total, validates minimum order
  requirements, and submits the order via POST to /submit-order.

- styles/Style.css: The main shared stylesheet used across all pages.
  Contains styling for the header, navigation, buttons, dropdowns, movie
  cards, order summary table, and genre buttons including hover and active
  states.

- styles/home.css: Stylesheet for the home page. Contains styling for the
  banner image and welcome section.

- styles/stats.css: Stylesheet for the statistics page. Contains styling
  for the stats cards and stats table layout.

- streamingServices/: Folder containing JSON files for each streaming service
  (streamIt.json, movieVerse.json, cinemaTime.json, cineWorld.json). Each file contains the
  service id, name, minOrder, serviceFee, and all genres and movies. New
  services can be added by placing additional .json files in this folder
  without changing any code.

- images/: Folder containing all images used across the site including
  home.jpeg (banner), logo.jpeg (header logo), selected.svg, unselected.svg
  (movie selection icons), and remove.svg (delete icon).

- README.txt: Documentation describing the project structure, design decisions, 
  and usage instructions.


Design Decisions:

- MongoDB is used for all data storage across three collections: services,
  users and orders. No data is stored in memory.
- express-session is used to manage user sessions. The session stores the
  user's _id, username and admin status.
- Two auth middleware functions are used: isLoggedIn checks for an active
  session and isAdmin checks for admin privileges. These are applied to
  routes as needed before the route handler runs.
- The user object is passed to every res.render() call so that header.pug
  can conditionally render the correct navigation links.
- Orders are stored in the database with the logged-in user's _id attached,
  allowing order history to be retrieved per user on the profile page.
- Private users are shown in the user directory as faded and non-clickable.
  Clicking a public user navigates to their profile page.
- The registration form validates that both password fields match on the
  client side before sending the request to the server.
- Deleting a service also removes it from all existing orders using
  MongoDB's $unset operator.
- New movie IDs are generated by finding the maximum existing ID across all
  services and adding 1 to ensure uniqueness.

How to Run:

1. Unzip the submission folder.
2. Make sure Node.js and MongoDB are installed on your machine.
3. Open a terminal in the project folder.
4. Run: npm install
5. Start MongoDB if it is not already running:
   Windows:
   - Open a Command Prompt (NOT Powershell) and navigate to your 
     MongoDB bin folder (e.g. C:\Program Files\MongoDB\Server\8.2\bin\)
   - Run: mongod.exe --dbpath=C:\data\db

   Mac:
   - MongoDB may already be running, if not run:
     mongod --dbpath=/usr/local/var/mongodb

   Keep this terminal open while running the server.
6. Initialize the database (run once or to reset):
   node initializeDatabase.js
7. Start the server:
   node server.js
8. Open a browser and go to http://localhost:3000/