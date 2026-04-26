// Import required libraries and tools
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // CORS allows our frontend to communicate with this backend
const http = require('http'); // HTTP is needed to wrap Express for WebSockets
const initSocket = require('./socket'); // Our custom Socket.io logic
const { WebSocketServer } = require('ws'); // Native WebSockets library for Yjs
const { setupWSConnection } = require('y-websocket/bin/utils'); // Yjs connection handler
require('dotenv').config(); // Load environment variables from .env file

// Initialize the Express application
const app = express();
// Wrap the Express app in an HTTP server so it can handle WebSocket connections
const server = http.createServer(app); 

// Add middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Allow parsing of JSON request bodies

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Connect to MongoDB using the URI stored in the .env file
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log(' MongoDB Connected Successfully!'))
  .catch((err) => console.log(' MongoDB Connection Failed:', err.message));

// --- API Routes ---
// Import and register the room-related API routes under the '/api/rooms' prefix
const roomRoutes = require('./routes/room');
app.use('/api/rooms', roomRoutes);

// --- Real-time Communication (WebSockets) ---

// 1. Initialize Socket.io (Used for Chat, Active Users list, and simple signals)
initSocket(server);

// 2. Initialize Yjs WebSockets (Used for True CRDT Real-time Code Editing)
const wss = new WebSocketServer({ noServer: true }); // Create a WebSocket server that doesn't bind to a port yet
wss.on('connection', setupWSConnection); // Let Yjs handle any new connections

// Listen for HTTP upgrade requests (this is how standard HTTP turns into WebSockets)
server.on('upgrade', (request, socket, head) => {
  // If the request URL starts with '/yjs', pass it to the Yjs WebSocket server
  if (request.url.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Start the server and listen on the specified port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => { // We use server.listen instead of app.listen because of WebSockets
  console.log(`🚀 Server running on port ${PORT}`);
});