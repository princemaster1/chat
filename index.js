const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

const postgresURI = 'postgres://collins_user:SpkuLYpAsCW0WdJ0niHg0ZrRKqFtxMs5@dpg-cln48jhr6k8c73aauu1g-a.oregon-postgres.render.com/collins';

const pool = new Pool({
  connectionString: postgresURI,
  ssl: { rejectUnauthorized: false } 
});

const createTableQuery = `
  DROP TABLE IF EXISTS chat;
  CREATE TABLE chat (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    username TEXT NOT NULL,
    timestamp BIGINT NOT NULL
  );
`;

pool.query(createTableQuery, (err, result) => {
  if (err) {
    console.error('Error creating table:', err);
  } else {
    console.log('Table created or already exists');
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log(`${socket.username} connected`);

  socket.on('set username', ({ username }) => {
    socket.username = username;
    io.emit('user joined', { username });
  });

  socket.on('chat message', (data) => {
    const { msg, time } = data;

    if (!msg.trim()) {
      return;
    }

    const insertQuery = 'INSERT INTO chat (message, sender_id, username, timestamp) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [msg, socket.id, socket.username || 'Unknown', time];

    pool.query(insertQuery, values, (insertErr, insertResult) => {
      if (insertErr) {
        console.error('Error inserting message into PostgreSQL:', insertErr);
      } else {
        console.log('Message inserted into PostgreSQL:', insertResult.rows[0]);
      }
    });

    io.to(socket.id).emit('chat message', { msg, senderId: socket.id, time, isUser: true, username: socket.username });
    socket.broadcast.emit('chat message', { msg, senderId: socket.id, time, isUser: false, username: socket.username });
  });

  socket.on('delete message', ({ messageId }) => {
    const deleteQuery = 'DELETE FROM chat WHERE id = $1';
    pool.query(deleteQuery, [messageId], (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.error('Error deleting message from PostgreSQL:', deleteErr);
      } else {
        console.log('Message deleted from PostgreSQL:', messageId);
        io.emit('delete message', { messageId });
      }
    });
  });

  socket.on('get stored messages', () => {
    const retrieveQuery = 'SELECT * FROM chat ORDER BY timestamp';
    pool.query(retrieveQuery, (retrieveErr, retrieveResult) => {
      if (retrieveErr) {
        console.error('Error retrieving stored messages from PostgreSQL:', retrieveErr);
      } else {
        const storedMessages = retrieveResult.rows;
        socket.emit('stored messages', storedMessages);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`${socket.username} disconnected`);
  });

  socket.on('reconnect', () => {
    console.log(`${socket.username} reconnected`);
    socket.emit('get stored messages');
  });

  socket.on('get online users', () => {
    const onlineUsers = Object.values(io.sockets.connected)
      .filter((connectedSocket) => connectedSocket.username)
      .map((connectedSocket) => connectedSocket.username);
    socket.emit('online users', onlineUsers);
  });
});

console.log('Starting the server...');
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
            
