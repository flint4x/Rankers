const express = require('express');
const session = require('express-session');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const sharedSession = require("express-socket.io-session");
const users = require('./users');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
const sessionMiddleware = session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
});
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

// Chat history in memory
const messageHistory = [];

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username].password === password) {
    req.session.user = username;
    return res.redirect('/chat.html');
  }
  return res.redirect('/login.html');
});

// Session check middleware
function requireLogin(req, res, next) {
  if (req.session.user && users[req.session.user]) {
    return next();
  }
  res.redirect('/login.html');
}

// Protected chat route
app.get('/chat.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Share session with Socket.IO
io.use(sharedSession(sessionMiddleware, {
  autoSave: true
}));

// Socket.io connection
io.on('connection', (socket) => {
  const username = socket.handshake.session.user;

  if (!username || !users[username]) {
    return socket.disconnect(true);
  }

  const userIcon = users[username].icon || '/images/default.png';

  // Send chat history on connect
  socket.emit('chat history', messageHistory);

  socket.on('chat message', (msg) => {
    const fullMsg = {
      user: username,
      text: msg,
      icon: userIcon
    };

    messageHistory.push(fullMsg);
    if (messageHistory.length > 100) messageHistory.shift();

    io.emit('chat message', fullMsg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
