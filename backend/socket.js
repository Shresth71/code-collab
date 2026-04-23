function initSocket(server) {
  const { Server } = require('socket.io');

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Track users in each room
  const roomUsers = {};

  io.on('connection', (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    // When a user joins a room
    socket.on('join-room', ({ roomId, username }) => {
      socket.join(roomId);

      // Add user to roomUsers tracking
      if (!roomUsers[roomId]) roomUsers[roomId] = [];
      roomUsers[roomId].push({ socketId: socket.id, username });

      console.log(`👤 ${username} joined room ${roomId}`);
      // Chat message
      socket.on('send-message', ({ roomId, message }) => {
        socket.to(roomId).emit('receive-message', message);
      });

      // Tell everyone in the room that a new user joined
      io.to(roomId).emit('room-users', roomUsers[roomId]);
    });

    // When a user types code
    socket.on('code-change', ({ roomId, code }) => {
      // Send to everyone EXCEPT the person who typed
      socket.to(roomId).emit('code-change', { code });
    });

    // When a user changes language
    socket.on('language-change', ({ roomId, language }) => {
      socket.to(roomId).emit('language-change', { language });
    });

    // When a user disconnects
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);

      // Remove user from all rooms
      for (const roomId in roomUsers) {
        roomUsers[roomId] = roomUsers[roomId].filter(
          user => user.socketId !== socket.id
        );
        // Notify remaining users
        io.to(roomId).emit('room-users', roomUsers[roomId]);
      }
    });

  });
}

module.exports = initSocket;