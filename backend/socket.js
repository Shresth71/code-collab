// Import the Room model to update the database
const Room = require('./models/Room');

// Export a function that takes the HTTP server and attaches Socket.io to it
function initSocket(server) {
  // Import the Socket.io Server class
  const { Server } = require('socket.io');

  // Initialize Socket.io with CORS settings allowing connections from anywhere
  const io = new Server(server, {
    cors: {
      origin: '*', // In production, you might want to restrict this to your frontend URL
      methods: ['GET', 'POST']
    }
  });

  // Keep track of which users are in which room: { roomId: [{ socketId, username, color }] }
  const roomUsers = {};

  // A predefined list of distinct, vibrant colors for users in the room
  const USER_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16',
    '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
    '#d946ef', '#eb1a3dff'
  ];

  // Helper function to deterministically assign a color based on username
  // This ensures a user gets the exact same color even if they refresh the page
  function getColorForUsername(username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % USER_COLORS.length;
    return USER_COLORS[index];
  }

  // Store timeouts for the debounced saving function
  const debounceTimers = {};

  // Debounce function to prevent hammering the database with save requests on every keystroke
  function debounceSave(roomId, code) {
    if (debounceTimers[roomId]) clearTimeout(debounceTimers[roomId]);
    debounceTimers[roomId] = setTimeout(async () => {
      try {
        await Room.findOneAndUpdate({ roomId }, { code });
        console.log(`💾 Saved code for room ${roomId} to database`);
      } catch (err) {
        console.log('Save error:', err.message);
      }
    }, 2000); // Wait 2 seconds after typing stops before saving
  }

  // Listen for new WebSocket connections from clients
  io.on('connection', (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    // Event: User joins a specific room
    socket.on('join-room', async ({ roomId, username }) => {
      // Subscribe this socket to the room's communication channel
      socket.join(roomId);

      // Initialize tracking arrays/variables for this room if they don't exist yet
      if (!roomUsers[roomId]) roomUsers[roomId] = [];

      // Assign a consistent color to this user based on their username
      const color = getColorForUsername(username);

      // Add the user to the room's active user list
      roomUsers[roomId].push({
        socketId: socket.id,
        username,
        color
      });

      console.log(`👤 ${username} joined room ${roomId} with color ${color}`);

      // Fetch the current state of the room from MongoDB and send it only to the user who just joined
      try {
        const room = await Room.findOne({ roomId });
        socket.emit('load-room', {
          code: room?.code || '',
          language: room?.language || 'javascript',
          color, // Give the user their newly assigned color
        });
      } catch (err) {
        socket.emit('load-room', {
          code: '',
          language: 'javascript',
          color,
        });
      }

      // Broadcast the updated user list to everyone currently in the room
      io.to(roomId).emit('room-users', roomUsers[roomId]);
    });

    // Event: Save code to MongoDB
    // (Note: Yjs handles real-time syncing between users; this event is just to persist the latest code to the DB)
    socket.on('save-code', ({ roomId, code }) => {
      debounceSave(roomId, code);
    });

    // Event: User changes the programming language
    socket.on('language-change', ({ roomId, language }) => {
      // Broadcast the new language to all OTHER users in the room
      socket.to(roomId).emit('language-change', { language });
      // Update the language in the database asynchronously
      Room.findOneAndUpdate({ roomId }, { language }).catch(console.error);
    });

    // Event: User sends a chat message
    socket.on('send-message', ({ roomId, message }) => {
      // Broadcast the message to all OTHER users in the room
      socket.to(roomId).emit('receive-message', message);
    });

    // Event: User disconnects (closes tab, loses internet, etc.)
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);

      // Iterate through all rooms to find and remove the disconnected user
      for (const roomId in roomUsers) {
        const beforeCount = roomUsers[roomId].length;
        
        // Filter out the disconnected user
        roomUsers[roomId] = roomUsers[roomId].filter(
          user => user.socketId !== socket.id
        );
        
        // If the user was actually in this room, notify the remaining users of the updated list
        if (roomUsers[roomId].length !== beforeCount) {
          io.to(roomId).emit('room-users', roomUsers[roomId]);
        }
      }
    });
  });
}

// Export the init function
module.exports = initSocket;