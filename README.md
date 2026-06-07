Movie Weekend Planner – Assignment 4
A full-stack web application that allows users to browse movies across multiple streaming services, place rental orders, view statistics, and manage accounts. Built with Node.js, Express, MongoDB, and the PUG template engine.
Features
User Features
Register and log in securely
Browse movies across multiple streaming services filtered by genre
Build rental orders with real-time price totals, service fees, and tax
Minimum order validation per streaming service
View order statistics per streaming service
View and edit personal profile (username, password, privacy settings)
View full order history
Admin Features
View directory of all registered users
Delete users
Add, edit, and delete streaming services
Manage genres and movies within services
Tech Stack
Backend: Node.js, Express
Database: MongoDB
Authentication: express-session
Templating: PUG
Frontend: Vanilla JavaScript, CSS
Data: MongoDB collections (users, services, orders)
Getting Started
Prerequisites
Node.js installed
MongoDB installed and running
Installation
git clone https://github.com/GavinJoseph27/movie-weekend-planner.git
cd movie-weekend-planner
npm install
Initialize Database
node initializeDatabase.js
Run the Server
node server.js
Open the App
http://localhost:3000
Project Structure
movie-weekend-planner/
├── server.js                  # Main Express server (routes, auth, logic)
├── mwpDB.js                   # MongoDB connection helper
├── initializeDatabase.js      # Database setup script
├── pages/                     # PUG templates
│   ├── header.pug
│   ├── home.pug
│   ├── login.pug
│   ├── register.pug
│   ├── orderForm.pug
│   ├── statistics.pug
│   ├── services.pug
│   ├── serviceInfo.pug
│   ├── users.pug
│   └── userProfile.pug
├── scripts/
│   └── Script.js              # Client-side order logic
├── styles/
│   ├── Style.css
│   ├── home.css
│   └── stats.css
├── streamingServices/         # Initial JSON service data
└── images/                    # UI assets
How It Works
All data is stored in MongoDB (no in-memory storage)
User sessions are handled using express-session
Middleware protects routes based on login and admin status
Orders are linked to the logged-in user for history tracking
Navigation updates dynamically based on authentication state
Streaming services are loaded from JSON during database initialization
Order calculations happen client-side with server validation
Statistics are computed server-side from database data
Authentication Levels
Guest
View home page
Register / login
User
Browse movies
Place orders
View stats
Edit profile
View order history
Admin
Manage users
Manage services and movies
Full system access
