const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// MongoDB Connection String (replace with your connection string)
const mongoURI ='mongodb+srv://princemaster:23394401@chattingproject.lbnriwo.mongodb.net/?retryWrites=true&w=majority';

// Connect to MongoDB
const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect((err) => {
  if (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  } else {
    console.log('Connected to MongoDB');
  }
});

// Serve HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('User connected');

  // Listen for chat messages
  socket.on('chat message', (msg) => {
    // Save the message to MongoDB (replace 'chat' with your collection name)
    const chatCollection = client.db('chattingproject').collection('chat');
    chatCollection.insertOne({ message: msg }, (insertErr, result) => {
      if (insertErr) {
        console.error('Error inserting message into MongoDB:', insertErr);
      } else {
        console.log('Message inserted into MongoDB:', result.ops[0]);
      }
    });

    // Broadcast the message to all connected clients
    io.emit('chat message', msg);
  });

  // Disconnect event
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start the server
console.log('Starting the server...');
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
