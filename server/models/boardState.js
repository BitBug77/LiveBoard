const mongoose = require('mongoose');

// Create a more flexible drawing schema that can handle different drawing types
const drawingSchema = new mongoose.Schema({
  // Common properties
  type: { type: String, required: true }, // 'line', 'square', 'circle', 'freedraw', etc.
  color: { type: String, required: true },
  
  // For shapes (square, rectangle, circle)
  startX: { type: Number },
  startY: { type: Number },
  endX: { type: Number },
  endY: { type: Number },
  
  // For lines and freedraw paths
  points: [{
    x: { type: Number },
    y: { type: Number }
  }],
  
  // Style properties
  thickness: { type: Number }, // Line thickness
  size: { type: Number },      // Alternative size property
  
  // Metadata
  timestamp: { type: Date, default: Date.now }
}, { strict: false }); // Use strict: false to allow additional properties

// Define text schema with minimum requirements and maximum flexibility
const textElementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  // Make both content and text optional in the schema definition
  content: { type: String, required: false },
  text: { type: String, required: false },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  color: { type: String, default: '#000000' },
  fontSize: { type: Number }, // Optional
  timestamp: { type: Date, default: Date.now }
}, { 
  strict: false, // Maximum flexibility for incoming data
  minimize: false // Don't remove empty objects
});

// Define the board state schema with maximum flexibility
const boardStateSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  drawings: [drawingSchema],  // Array of drawing operations
  texts: [mongoose.Schema.Types.Mixed],  // Use Mixed type for maximum flexibility
  history: {
    type: [
      {
        drawings: [mongoose.Schema.Types.Mixed],
        texts: [mongoose.Schema.Types.Mixed],
        timestamp: { type: Date, default: Date.now }
      }
    ],
    default: []
  },
  future: {
    type: [
      {
        drawings: [mongoose.Schema.Types.Mixed],
        texts: [mongoose.Schema.Types.Mixed],
        timestamp: { type: Date, default: Date.now }
      }
    ],
    default: []
  },
  lastUpdated: { type: Date, default: Date.now },
}, { 
  timestamps: true,
  strict: false // Maximum flexibility
});

// Add a method to process incoming text elements before save
boardStateSchema.methods.addText = function(textData) {
  // Ensure we have a texts array
  if (!this.texts) {
    this.texts = [];
  }
  
  // Handle both text and content fields
  const processedText = { ...textData };
  
  // If neither content nor text exists, but one of them is in the original data, copy it
  if (!processedText.content && !processedText.text) {
    if (textData.content) processedText.content = textData.content;
    if (textData.text) processedText.text = textData.text;
  }
  
  // Ensure cross-compatibility between fields
  if (processedText.content && !processedText.text) {
    processedText.text = processedText.content;
  }
  if (processedText.text && !processedText.content) {
    processedText.content = processedText.text;
  }
  
  this.texts.push(processedText);
  return processedText;
};

// Add a method to save the current state to history
boardStateSchema.methods.saveToHistory = function() {
  const currentState = {
    drawings: JSON.parse(JSON.stringify(this.drawings)), // Deep copy
    texts: JSON.parse(JSON.stringify(this.texts)),       // Deep copy
    timestamp: new Date()
  };
  
  if (!this.history) {
    this.history = [];
  }
  
  this.history.push(currentState);
  
  // Limit history size to prevent memory issues
  if (this.history.length > 50) {
    this.history = this.history.slice(-50); // Keep only the 50 most recent states
  }
};

// Add method to clear future stack
boardStateSchema.methods.clearFuture = function() {
  this.future = [];
};

// Add method for undo operation
boardStateSchema.methods.undo = function() {
  if (this.history.length === 0) {
    return false;
  }
  
  // Save current state to future
  const currentState = {
    drawings: JSON.parse(JSON.stringify(this.drawings)), // Deep copy
    texts: JSON.parse(JSON.stringify(this.texts)),       // Deep copy
    timestamp: new Date()
  };
  
  this.future.push(currentState);
  
  // Restore previous state
  const previousState = this.history.pop();
  this.drawings = previousState.drawings;
  this.texts = previousState.texts;
  this.lastUpdated = new Date();
  
  return true;
};

// Add method for redo operation
boardStateSchema.methods.redo = function() {
  if (this.future.length === 0) {
    return false;
  }
  
  // Save current state to history
  this.saveToHistory();
  
  // Restore next state
  const nextState = this.future.pop();
  this.drawings = nextState.drawings;
  this.texts = nextState.texts;
  this.lastUpdated = new Date();
  
  return true;
};

module.exports = mongoose.model('BoardState', boardStateSchema);