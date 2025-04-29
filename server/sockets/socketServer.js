// sockets/socketServer.js
const Session = require('../models/Session'); // Fix the path

const setupSocketServer = (io) => {
  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a specific room
    socket.on('join_room', async ({ sessionId, userId }) => {
      socket.join(sessionId);
      console.log(`User ${userId} joined session ${sessionId}`);
      
      // Notify others in the room
      socket.to(sessionId).emit('user_joined', { userId });
      
      // Send current board state to the joining user
      try {
        const session = await Session.findById(sessionId);
        if (session) {
          socket.emit('board_state', session.boardState);
        }
      } catch (error) {
        console.error('Error fetching board state:', error);
      }
    });

    // Handle drawing events
    socket.on('draw', ({ sessionId, drawData }) => {
      socket.to(sessionId).emit('draw', drawData);
      
      // Update board state in database (debounced/throttled in production)
      updateBoardState(sessionId, 'draw', drawData);
    });

    // Handle cursor movement
    socket.on('cursor', ({ sessionId, cursorData }) => {
      socket.to(sessionId).emit('cursor', cursorData);
    });

    // Handle text updates
    socket.on('text', ({ sessionId, textData }) => {
      socket.to(sessionId).emit('text', textData);
      
      // Update board state in database
      updateBoardState(sessionId, 'text', textData);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

// Helper function to update board state in database
const updateBoardState = async (sessionId, type, data) => {
  try {
    const session = await Session.findById(sessionId);
    if (session) {
      // Update specific part of board state based on type
      if (!session.boardState) session.boardState = {};
      
      if (type === 'draw') {
        if (!session.boardState.drawings) session.boardState.drawings = [];
        session.boardState.drawings.push(data);
      } else if (type === 'text') {
        if (!session.boardState.texts) session.boardState.texts = {};
        session.boardState.texts[data.id] = data;
      }
      
      await session.save();
    }
  } catch (error) {
    console.error('Error updating board state:', error);
  }
};

module.exports = setupSocketServer;