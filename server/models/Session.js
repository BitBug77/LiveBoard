const mongoose = require('mongoose');
const crypto = require('crypto');

// Define the session schema
const sessionSchema = new mongoose.Schema({
  name: String,
  host: mongoose.Schema.Types.ObjectId,
  participants: [mongoose.Schema.Types.ObjectId],
  isActive: { type: Boolean, default: true },
  joinCode: String,
  boardState: {
    type: Object,
    default: {},
  },
  history: {
    type: [Object], // Array of board states
    default: [],
  },
  future: {
    type: [Object], // For redo
    default: [],
  },
});

// Generate a unique 6-character join code before saving the session
sessionSchema.pre('save', function (next) {
  if (!this.joinCode) {
    // Generate a random 6-character alphanumeric code
    this.joinCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  }
  next();
});

// Export the session model after the pre-save hook
const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;
