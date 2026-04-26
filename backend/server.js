const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const initSocket = require('./socket');
const { WebSocketServer } = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');
require('dotenv').config();

const app = express();
const server = http.createServer(app); // wrap express with http

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log(' MongoDB Connected Successfully!'))
  .catch((err) => console.log(' MongoDB Connection Failed:', err.message));

// Routes
const roomRoutes = require('./routes/room');
app.use('/api/rooms', roomRoutes);

// Socket.io
initSocket(server);

// Yjs WebSockets
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', setupWSConnection);

server.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => { // use server.listen not app.listen
  console.log(`🚀 Server running on port ${PORT}`);
});
// 1. Import all tools needed
// 2. Create Express app
// 3. Wrap it in http server (for Socket.io)
// 4. Add middleware (CORS + JSON parsing)
// 5. Connect to MongoDB
// 6. Register API routes
// 7. Set up Socket.io
// 8. Start listening for requests on port 5000