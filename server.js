// server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Enable CORS for all origins (good for dev)
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('draw', (data) => {
    console.log(`Drawing event received: ${JSON.stringify(data)}`);
    socket.broadcast.emit('draw', data); // Send to other users
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Optional HTTP route
app.get('/', (req, res) => {
  res.send('Collaborative Whiteboard Server Running');
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
