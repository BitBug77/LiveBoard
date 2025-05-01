// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./api/auth/routes'));
app.use('/api/rooms', require('./api/rooms/routes'));
app.use('/api/board', require('./api/board/getboardstate'));
try {
  app.use('/api/auth', require('./api/auth/routes'));
  console.log('Auth routes loaded successfully');
} catch (error) {
  console.error('Error loading auth routes:', error.message);
  console.log('Make sure you have ./api/auth/routes.js file properly set up');
}

try {
  app.use('/api/rooms', require('./api/rooms/routes'));
  console.log('Room routes loaded successfully');
} catch (error) {
  console.error('Error loading room routes:', error.message);
}

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Initialize socket server
const setupSocketServer = require('./sockets/socketServer');
setupSocketServer(io);
console.log('Socket.io server initialized');

// Server port
const PORT = process.env.PORT || 5000;

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});