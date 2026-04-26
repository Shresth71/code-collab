// Import Express to create API routes
const express = require('express');
const router = express.Router();

// Import the Room model to interact with the MongoDB database
const Room = require('../models/Room');

// Import UUID to generate unique random IDs for rooms
const { v4: uuidv4 } = require('uuid');

// POST /api/rooms/create — Create a new room
// This endpoint is called when a user clicks "Create Room" on the home page
router.post('/create', async (req, res) => {
  try {
    // Generate a random 8-character string for the room ID
    const roomId = uuidv4().slice(0, 8);
    
    // Create a new room document in MongoDB using the generated ID
    const room = new Room({ roomId });
    await room.save(); // Save it to the database
    
    // Send back the new room ID so the frontend can redirect the user
    res.status(201).json({ roomId });
  } catch (err) {
    // If something goes wrong, send a 500 Internal Server Error
    res.status(500).json({ error: 'Failed to create room', details: err.message });
  }
});

// GET /api/rooms/join/:roomId — Check if a room exists
// This endpoint is called when a user tries to join an existing room
router.get('/join/:roomId', async (req, res) => {
  try {
    // Search the database for a room with the provided ID
    const room = await Room.findOne({ roomId: req.params.roomId });
    
    // If the room doesn't exist, send a 404 Not Found error
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    // If it exists, send back the room details (like current code and language)
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Export the router so it can be registered in server.js
module.exports = router;