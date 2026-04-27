// Import mongoose, the library used to interact with MongoDB
const mongoose = require('mongoose');

// Define the schema (structure) for a "Room" document in the database
const roomSchema = new mongoose.Schema({
  // The unique identifier for the room (e.g. 'df265d13')
  roomId: {
    type: String,
    required: true,
    unique: true, // Ensures no two rooms can have the exact same ID
  },
  // The current programming language selected in this room
  language: {
    type: String,
    default: 'javascript', // If no language is provided, default to JS
  },
  // The actual text/code written in the editor
  code: {
    type: String,
    default: '', // Start with an empty editor
  },
  // Timestamp to track when the room was created
  // The 'expires' option creates a TTL index — MongoDB will automatically
  // delete rooms 24 hours after creation to keep the database clean
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // 24 hours in seconds (24 * 60 * 60)
  }
});

// Export the 'Room' model so it can be used in other files to query the database
module.exports = mongoose.model('Room', roomSchema);