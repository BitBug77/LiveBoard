// backend/api/rooms/roomController.js

const Session = require('../../models/Session');
const BoardState = require('../../models/boardState');


// @desc    Create a new session
// @route   POST /api/rooms/create
// @access  Private
const createSession = async (req, res) => {
  const userId = req.user.id;
  const { name = "Untitled Session" } = req.body; // Allow customizing name but provide default

  try {
    // Create a session - the pre-save hook will automatically create the BoardState
    const session = await Session.create({
      name,
      host: userId,
      participants: [userId],
    });

    // Get the newly created board state
    const boardState = await session.getBoardState();

    const joinLink = `https://localhost:3000/join/${session.joinCode}`;

    res.status(201).json({
      _id: session._id,
      name: session.name,
      host: session.host,
      joinCode: session.joinCode,
      joinLink,
      boardStateId: boardState._id,
      createdAt: session.createdAt
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Join a session using code
// @route   POST /api/rooms/join
// @access  Private
const joinSession = async (req, res) => {
  const { joinCode } = req.body;
  const userId = req.user.id; // From auth middleware

  try {
    const session = await Session.findOne({ joinCode, isActive: true });

    if (!session) {
      return res.status(404).json({ message: 'Session not found or inactive' });
    }

    // Get the associated board state
    const boardState = await session.getBoardState();

    if (!boardState) {
      return res.status(404).json({ message: 'Board state not found for session' });
    }

    // Check if user is already a participant
    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
      await session.save();
    }

    res.json({
      _id: session._id,
      name: session.name,
      host: session.host,
      joinCode: session.joinCode,
      boardStateId: boardState._id,
      createdAt: session.createdAt
    });
  } catch (error) {
    console.error('Error joining session:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createSession, joinSession };
