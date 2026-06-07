# Movie Weekend Planner – Assignment 4

A full-stack web application that allows users to browse movies across multiple streaming services, place rental orders, view order statistics, and manage their accounts. Built with Node.js, Express, MongoDB, and the PUG template engine.

## Features

- Register and log in securely
- Browse movies across multiple streaming services filtered by genre
- Build a rental order with real-time price totals, service fees, and tax
- Minimum order validation per streaming service
- View order statistics per streaming service
- View and edit user profile (username, password, privacy settings)
- View full order history
- Admin-only user management (view and delete users)
- Admin-only streaming service management (add, edit, delete services)
- Admin-only movie and genre management

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** MongoDB
- **Authentication:** express-session (sessions + authorization middleware)
- **Templating:** PUG
- **Frontend:** Vanilla JavaScript, CSS
- **Data Storage:** MongoDB collections (users, services, orders)

## Getting Started

### Prerequisites

- Node.js installed on your machine
- MongoDB installed and running locally

### Installation

```bash
git clone https://github.com/GavinJoseph27/movie-weekend-planner.git
cd movie-weekend-planner
npm install

### Initialize Database

```bash
node initializeDatabase.js

```bash
node server.js

### Open the Application

http://localhost:3000

### Project Structure

movie-weekend-planner/
├── server.js                 # Main Express server (routes, auth, logic)
├── mwpDB.js                  # MongoDB connection helper
├── initializeDatabase.js     # Database initialization script
├── pages/                    # PUG templates
│   ├── header.pug            # Shared navigation header
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
│   └── Script.js             # Client-side order logic
├── styles/
│   ├── Style.css
│   ├── home.css
│   └── stats.css
├── streamingServices/        # JSON seed data for services
└── images/                   # Static assets

## How It Works

- MongoDB stores all application data (users, services, orders)
- User authentication is handled using sessions
- Middleware enforces login and admin authorization
- Orders are linked to the logged-in user for history tracking
- Statistics are calculated server-side from MongoDB data
- Streaming services are initialized from JSON seed files
- Order form logic runs client-side with server validation
- Navigation updates dynamically based on user login state

## Authentication

### Guest Users
- View home page
- Register an account
- Log in
### Logged-In Users
- Browse and order movies
- View statistics
- Edit profile
- View order history
### Admin Users
- Manage users
- Manage streaming services
- Manage movies and genres
- Full system access
