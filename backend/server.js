const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const initSocket = require('./socket');
require('dotenv').config();

const app = express();
const server = http.createServer(app); // wrap express with http

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch((err) => console.log('❌ MongoDB Connection Failed:', err.message));

// Routes
const roomRoutes = require('./routes/room');
app.use('/api/rooms', roomRoutes);

// Socket.io
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => { // use server.listen not app.listen
  console.log(`🚀 Server running on port ${PORT}`);
});