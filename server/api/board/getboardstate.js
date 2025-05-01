const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Initialize Express router
const router = express.Router();

// Import the BoardState model (assuming it's in the models directory)
const BoardState = mongoose.model('BoardState');

/**
 * GET /api/board/:roomCode
 * Retrieves the entire board state for a specific room
 */
router.get('/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    console.log(`[API] Fetching board state for room: ${roomCode}`);
    
    if (!roomCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Room code is required' 
      });
    }
    
    // Find the board state using the room code
    const boardState = await BoardState.findOne({ roomCode });
    
    if (!boardState) {
      console.log(`[API] No board state found for room: ${roomCode}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Board state not found' 
      });
    }
    
    // Log board state size for debugging
    const boardStateSize = JSON.stringify(boardState).length;
    console.log(`[API] Board state size: ${boardStateSize} bytes`);
    console.log(`[API] Board has ${boardState.drawings.length} drawings and ${boardState.texts.length} texts`);
    
    // Return the board state
    return res.status(200).json({
      success: true,
      data: {
        drawings: boardState.drawings,
        texts: boardState.texts,
        lastUpdated: boardState.lastUpdated
      }
    });
  } catch (error) {
    console.error('[API ERROR] Failed to fetch board state:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching board state',
      error: error.message
    });
  }
});

module.exports = router;