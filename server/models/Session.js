// models/Session.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const sessionSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    joinCode: {
      type: String,
      unique: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    boardState: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Generate a unique 6-character join code
sessionSchema.pre('save', function (next) {
  if (!this.joinCode) {
    // Generate a random 6-character alphanumeric code
    this.joinCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  }
  next();
});

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;