const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

const mongoURI ='mongodb+srv://princemaster:23394401@chattingproject.lbnriwo.mongodb.net/?retryWrites=true&w=majority';

const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect((err) => {
  if (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  } else {
    console.log('Connected to MongoDB');
  }
});


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('chat message', (msg) => {
    
    const chatCollection = client.db('chattingproject').collection('chat');
    chatCollection.insertOne({ message: msg }, (insertErr, result) => {
      if (insertErr) {
        console.error('Error inserting message into MongoDB:', insertErr);
      } else {
        console.log('Message inserted into MongoDB:', result.ops[0]);
      }
    });

    
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

console.log('Starting the server...');
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
