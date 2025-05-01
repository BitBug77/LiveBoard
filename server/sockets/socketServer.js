// sockets/socketServer.js
const Session = require('../models/Session'); // For session management
const BoardState = require('../models/boardState'); // Import the enhanced BoardState model

const setupSocketServer = (io) => {
  console.log('Setting up socket server...');
  
  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Log all incoming socket data for debugging
    socket.onAny((event, ...args) => {
      console.log(`[SOCKET DEBUG] Event: ${event}`, JSON.stringify(args));
    });

    // Join a specific room
    socket.on('join_room', async ({ sessionId, userId }) => {
      console.log(`[JOIN_ROOM] Request to join: sessionId=${sessionId}, userId=${userId}`);
      
      if (!sessionId) {
        console.error('[JOIN_ROOM ERROR] Session ID is missing');
        socket.emit('error', { message: 'Session ID is required' });
        return;
      }

      if (!userId) {
        console.warn('[JOIN_ROOM WARNING] User ID is missing');
      }

      try {
        socket.join(sessionId);
        console.log(`[JOIN_ROOM SUCCESS] User ${userId} joined session ${sessionId}`);
        console.log(`[ROOM INFO] Room ${sessionId} has ${io.sockets.adapter.rooms.get(sessionId)?.size || 0} participants`);
        
        // Notify others in the room
        socket.to(sessionId).emit('user_joined', { userId });
        
        // Send current board state from BoardState model to the joining user
        try {
          // Find board state using room code (sessionId)
          const boardState = await BoardState.findOne({ roomCode: sessionId });
          
          if (boardState) {
            console.log(`[BOARD_STATE] Sending board state to user ${userId}`);
            // Log board state size for debugging
            const boardStateSize = JSON.stringify(boardState).length;
            console.log(`[BOARD_STATE] Size: ${boardStateSize} bytes`);
            
            // Send the entire board state to the joining user
            socket.emit('board_state', { 
              drawings: boardState.drawings,
              texts: boardState.texts
            });
            
            // Add clear console message about board state
            console.log(`[BOARD_STATE] Board state successfully sent to user ${userId}`);
            console.log(`[BOARD_STATE] Sent ${boardState.drawings.length} drawings and ${boardState.texts.length} text elements`);
          } else {
            // Create a new board state if one doesn't exist
            console.log(`[BOARD_STATE] No existing board state found, initializing new state for ${sessionId}`);
            const newBoardState = new BoardState({
              roomCode: sessionId,
              drawings: [],
              texts: [],
              history: [],
              future: []
            });
            await newBoardState.save();
            console.log(`[BOARD_STATE] New board state initialized for session ${sessionId}`);
            socket.emit('board_state', { drawings: [], texts: [] });
          }
        } catch (error) {
          console.error('[DB ERROR] Error fetching board state:', error);
          socket.emit('error', { message: 'Error loading board state' });
        }
      } catch (error) {
        console.error('[JOIN_ROOM ERROR] Failed to join room:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Handle drawing events - UPDATED to handle different drawing types
    socket.on('draw', async ({ sessionId, drawData }) => {
      console.log(`[DRAW] Session: ${sessionId}, Type: ${drawData?.type || 'unknown'}`);
      
      if (!sessionId || !drawData) {
        console.error('[DRAW ERROR] Invalid draw data or missing sessionId');
        return;
      }
      
      // Broadcast draw data to all other clients in the room
      socket.to(sessionId).emit('draw', drawData);
      
      // Debug draw data contents
      console.log('[DRAW DATA]', JSON.stringify(drawData).substring(0, 200) + '...');
      
      // Update board state in BoardState collection
      try {
        let boardState = await BoardState.findOne({ roomCode: sessionId });
        
        if (!boardState) {
          boardState = new BoardState({
            roomCode: sessionId,
            drawings: [],
            texts: []
          });
        }
        
        // Save current state to history before updating
        boardState.saveToHistory();
        
        // Clear future stack on new action
        boardState.clearFuture();
        
        // Add new drawing - store the entire drawData object as-is
        // This way we can handle any drawing type the frontend sends
        boardState.drawings.push(drawData);
        
        // Update timestamp
        boardState.lastUpdated = new Date();
        
        await boardState.save();
        console.log(`[DB UPDATE] Draw data saved for session ${sessionId}`);
        console.log(`[BOARD_STATE] Board state updated with new drawing in session ${sessionId}`);
        console.log(`[BOARD_STATE] Current board has ${boardState.drawings.length} drawings and ${boardState.texts.length} texts`);
      } catch (err) {
        console.error('[DB ERROR] Failed to save draw data:', err);
        // Log more details about the error
        console.error('[DB ERROR] Error details:', err.message);
        if (err.errors) {
          Object.keys(err.errors).forEach(key => {
            console.error(`[DB ERROR] Field '${key}': ${err.errors[key].message}`);
          });
        }
      }
    });

    // Handle cursor movement
    socket.on('cursor', ({ sessionId, cursorData }) => {
      if (!sessionId || !cursorData) {
        console.error('[CURSOR ERROR] Invalid cursor data or missing sessionId');
        return;
      }
      
      console.log(`[CURSOR] User ${cursorData.userId} at position x:${cursorData.x}, y:${cursorData.y}`);
      socket.to(sessionId).emit('cursor', cursorData);
    });

    // Handle text updates
    socket.on('text', async ({ sessionId, textData }) => {
      console.log(`[TEXT] Session: ${sessionId}, Text ID: ${textData?.id || 'unknown'}`);
      
      if (!sessionId || !textData) {
        console.error('[TEXT ERROR] Invalid text data or missing sessionId');
        return;
      }
      
      socket.to(sessionId).emit('text', textData);
      
      // Debug text data
      console.log('[TEXT DATA]', JSON.stringify(textData));
      
      // Update board state with text data
      try {
        let boardState = await BoardState.findOne({ roomCode: sessionId });
        
        if (!boardState) {
          boardState = new BoardState({
            roomCode: sessionId,
            drawings: [],
            texts: []
          });
        }
        
        // Save current state to history before updating
        boardState.saveToHistory();
        
        // Clear future stack on new action
        boardState.clearFuture();
        
        // Check if this text already exists (update) or is new (add)
        const existingTextIndex = boardState.texts.findIndex(t => t.id === textData.id);
        
        if (existingTextIndex >= 0) {
          // Update existing text
          boardState.texts[existingTextIndex] = {
            id: textData.id,
            x: textData.x,
            y: textData.y,
            text: textData.text,
            color: textData.color || '#000000',
            fontSize: textData.fontSize || 16,
            timestamp: new Date()
          };
          console.log(`[TEXT UPDATE] Updated existing text with ID ${textData.id}`);
        } else {
          // Add new text
          boardState.texts.push({
            id: textData.id,
            x: textData.x,
            y: textData.y,
            text: textData.text,
            color: textData.color || '#000000',
            fontSize: textData.fontSize || 16,
            timestamp: new Date()
          });
          console.log(`[TEXT NEW] Added new text with ID ${textData.id}`);
        }
        
        // Update timestamp
        boardState.lastUpdated = new Date();
        
        await boardState.save();
        console.log(`[DB UPDATE] Text data saved for session ${sessionId}`);
        console.log(`[BOARD_STATE] Board state updated with text in session ${sessionId}`);
        console.log(`[BOARD_STATE] Current board has ${boardState.drawings.length} drawings and ${boardState.texts.length} texts`);
      } catch (err) {
        console.error('[DB ERROR] Failed to save text data:', err);
      }
    });
    
    socket.on('undo', async ({ sessionId, userId }) => {
      console.log(`[UNDO] Request from user ${userId} in session ${sessionId}`);
      
      try {
        const boardState = await BoardState.findOne({ roomCode: sessionId });
        if (!boardState) {
          console.error(`[UNDO ERROR] Board state for ${sessionId} not found`);
          socket.emit('error', { message: 'Board state not found' });
          return;
        }
        
        // Use the undo method from the schema
        const undoSuccessful = boardState.undo();
        
        if (!undoSuccessful) {
          console.log(`[UNDO] No history available for session ${sessionId}`);
          socket.emit('info', { message: 'Nothing to undo' });
          return;
        }
        
        console.log(`[UNDO] History stack size: ${boardState.history.length}, Future stack size: ${boardState.future.length}`);
        
        await boardState.save();
        console.log(`[UNDO SUCCESS] State reverted for session ${sessionId}`);
        console.log(`[BOARD_STATE] Board state reverted to previous state in session ${sessionId}`);
        console.log(`[BOARD_STATE] Current board has ${boardState.drawings.length} drawings and ${boardState.texts.length} texts`);
        
        // Emit new state to all users
        io.to(sessionId).emit('board_state', {
          drawings: boardState.drawings,
          texts: boardState.texts
        });
        console.log(`[BROADCAST] Updated board state sent to all users in session ${sessionId}`);
      } catch (err) {
        console.error('[UNDO ERROR] Undo operation failed:', err);
        socket.emit('error', { message: 'Undo operation failed' });
      }
    });
    
    socket.on('redo', async ({ sessionId, userId }) => {
      console.log(`[REDO] Request from user ${userId} in session ${sessionId}`);
      
      try {
        const boardState = await BoardState.findOne({ roomCode: sessionId });
        if (!boardState) {
          console.error(`[REDO ERROR] Board state for ${sessionId} not found`);
          socket.emit('error', { message: 'Board state not found' });
          return;
        }
        
        // Use the redo method from the schema
        const redoSuccessful = boardState.redo();
        
        if (!redoSuccessful) {
          console.log(`[REDO] No future states available for session ${sessionId}`);
          socket.emit('info', { message: 'Nothing to redo' });
          return;
        }
        
        console.log(`[REDO] History stack size: ${boardState.history.length}, Future stack size: ${boardState.future.length}`);
        
        await boardState.save();
        console.log(`[REDO SUCCESS] State advanced for session ${sessionId}`);
        console.log(`[BOARD_STATE] Board state advanced to next state in session ${sessionId}`);
        console.log(`[BOARD_STATE] Current board has ${boardState.drawings.length} drawings and ${boardState.texts.length} texts`);
        
        // Emit new state to all users
        io.to(sessionId).emit('board_state', {
          drawings: boardState.drawings,
          texts: boardState.texts
        });
        console.log(`[BROADCAST] Updated board state sent to all users in session ${sessionId}`);
      } catch (err) {
        console.error('[REDO ERROR] Redo operation failed:', err);
        socket.emit('error', { message: 'Redo operation failed' });
      }
    });
    
    // Clear board
    socket.on('clear_board', async ({ sessionId, userId }) => {
      console.log(`[CLEAR_BOARD] Request from user ${userId} in session ${sessionId}`);
      
      try {
        let boardState = await BoardState.findOne({ roomCode: sessionId });
        
        if (!boardState) {
          boardState = new BoardState({
            roomCode: sessionId,
            drawings: [],
            texts: []
          });
        } else {
          // Save current state to history before clearing
          boardState.saveToHistory();
          
          // Clear future stack on new action
          boardState.clearFuture();
          
          // Clear the board
          boardState.drawings = [];
          boardState.texts = [];
        }
        
        // Update timestamp
        boardState.lastUpdated = new Date();
        
        await boardState.save();
        
        console.log(`[CLEAR_BOARD SUCCESS] Board cleared for session ${sessionId}`);
        
        // Emit cleared board to all users
        io.to(sessionId).emit('board_state', {
          drawings: [],
          texts: []
        });
        console.log(`[BROADCAST] Clear board notification sent to all users in session ${sessionId}`);
      } catch (err) {
        console.error('[CLEAR_BOARD ERROR] Clear board operation failed:', err);
        socket.emit('error', { message: 'Clear board operation failed' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[DISCONNECT] User disconnected: ${socket.id}`);
    });
  });

  // Log middleware for all incoming socket events
  io.use((socket, next) => {
    console.log(`[MIDDLEWARE] New connection attempt: ${socket.id}`);
    // You could add authentication checks here
    next();
  });

  console.log('Socket server setup complete');
};

module.exports = setupSocketServer;