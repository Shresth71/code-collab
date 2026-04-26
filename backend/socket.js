const Room = require('./models/Room');

function initSocket(server) {
  const { Server } = require('socket.io');

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const roomUsers = {};

  const USER_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16',
    '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
    '#d946ef', '#eb1a3dff'
  ];

  // Track which colors are used per room
  const roomColorIndex = {};

  const debounceTimers = {};

  function debounceSave(roomId, code) {
    if (debounceTimers[roomId]) clearTimeout(debounceTimers[roomId]);
    debounceTimers[roomId] = setTimeout(async () => {
      try {
        await Room.findOneAndUpdate({ roomId }, { code });
        console.log(`💾 Saved code for room ${roomId}`);
      } catch (err) {
        console.log('Save error:', err.message);
      }
    }, 2000);
  }

  io.on('connection', (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    socket.on('join-room', async ({ roomId, username }) => {
      socket.join(roomId);

      // Initialize room tracking
      if (!roomUsers[roomId]) roomUsers[roomId] = [];
      if (roomColorIndex[roomId] === undefined) roomColorIndex[roomId] = 0;

      // Assign unique color per room
      const color = USER_COLORS[roomColorIndex[roomId] % USER_COLORS.length];
      roomColorIndex[roomId]++;

      // Store user with their color
      roomUsers[roomId].push({
        socketId: socket.id,
        username,
        color
      });

      console.log(`👤 ${username} joined room ${roomId} with color ${color}`);

      // Send saved room data + assigned color to the joining user
      try {
        const room = await Room.findOne({ roomId });
        socket.emit('load-room', {
          code: room?.code || '',
          language: room?.language || 'javascript',
          color, // their unique color
        });
      } catch (err) {
        socket.emit('load-room', {
          code: '',
          language: 'javascript',
          color,
        });
      }

      // Tell everyone updated user list
      io.to(roomId).emit('room-users', roomUsers[roomId]);
    });

    // Save code to MongoDB (debounced)
    socket.on('save-code', ({ roomId, code }) => {
      debounceSave(roomId, code);
    });

    // Language change
    socket.on('language-change', ({ roomId, language }) => {
      socket.to(roomId).emit('language-change', { language });
      Room.findOneAndUpdate({ roomId }, { language }).catch(console.error);
    });

    // Chat
    socket.on('send-message', ({ roomId, message }) => {
      socket.to(roomId).emit('receive-message', message);
    });



    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);

      for (const roomId in roomUsers) {
        const before = roomUsers[roomId].length;
        roomUsers[roomId] = roomUsers[roomId].filter(
          user => user.socketId !== socket.id
        );
        if (roomUsers[roomId].length !== before) {
          io.to(roomId).emit('room-users', roomUsers[roomId]);
        }
      }
    });
  });
}

module.exports = initSocket;