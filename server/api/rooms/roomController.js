// backend/api/rooms/roomController.js
const Session = require('../../models/Session');

// @desc    Create a new session
// @route   POST /api/rooms/create
// @access  Private
const createSession = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id; // From auth middleware

  try {
    const session = await Session.create({
      name,
      host: userId,
      participants: [userId], // Host is also a participant
    });

    res.status(201).json({
      _id: session._id,
      name: session.name,
      joinCode: session.joinCode,
      host: session.host,
    });
  } catch (error) {
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
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createSession, joinSession };