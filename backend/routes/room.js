const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

// POST /api/rooms/create — create a new room
router.post('/create', async (req, res) => {
  try {
    const roomId = uuidv4().slice(0, 8);
    const room = new Room({ roomId });
    await room.save();
    res.status(201).json({ roomId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create room', details: err.message });
  }
});

// GET /api/rooms/join/:roomId — check if room exists
router.get('/join/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;