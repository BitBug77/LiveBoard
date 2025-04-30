// models/BoardState.js
const mongoose = require('mongoose');

const drawingSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  color: { type: String, required: true },
  size: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

const boardStateSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  drawings: [drawingSchema],  // Array of drawing operations
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('BoardState', boardStateSchema);
