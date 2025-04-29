// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from 'public' folder
app.use(express.static('public'));

// Real-time socket handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('draw', (data) => {
    socket.broadcast.emit('draw', data); // Send to others
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
