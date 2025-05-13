const express = require('express');
const session = require('express-session');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const users = require('./users');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, 'public')));

// Store messages in memory
const messageHistory = [];

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    req.session.user = username;
    return res.redirect('/chat.html');
  }
  return res.redirect('/login.html');
});

// Protect chat page
app.get('/chat.html', (req, res, next) => {
  if (req.session.user) {
    return res.sendFile(path.join(__dirname, 'public', 'chat.html'));
  } else {
    return res.redirect('/login.html');
  }
});

// Socket.io logic
io.use((socket, next) => {
  const session = socket.request.session;
  if (session?.user) {
    next();
  } else {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const username = socket.handshake.session.user;

  // Send chat history to the newly connected user
  socket.emit('chat history', messageHistory);

  socket.on('chat message', (msg) => {
    const fullMsg = { user: username, text: msg };
    messageHistory.push(fullMsg);

    // Limit message history (optional)
    if (messageHistory.length > 100) {
      messageHistory.shift();
    }

    io.emit('chat message', fullMsg);
  });
});

// Share sessions with socket.io
const sharedSession = require('express-socket.io-session');
io.use(sharedSession(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
})));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
