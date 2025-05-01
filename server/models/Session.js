// models/Session.js
const mongoose = require('mongoose');
const crypto = require('crypto');



const SessionSchema = new mongoose.Schema({
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

module.exports = mongoose.model('Session', SessionSchema);


// Generate a unique 6-character join code
SessionSchema.pre('save', function (next) {
  if (!this.joinCode) {
    // Generate a random 6-character alphanumeric code
    this.joinCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  }
  next();
});

const Session = mongoose.model('Session', SessionSchema);
module.exports = Session;