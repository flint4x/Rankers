const express = require('express');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const users = require('./users');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Session middleware
const sessionMiddleware = session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
});
app.use(sessionMiddleware);

// Share session with Socket.IO
io.use(sharedSession(sessionMiddleware, {
  autoSave: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Message history
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

// Protected chat page
app.get('/chat.html', (req, res) => {
  if (req.session.user) {
    return res.sendFile(path.join(__dirname, 'public', 'chat.html'));
  } else {
    return res.redirect('/login.html');
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  const session = socket.handshake.session;

  if (!session || !session.user || !users[session.user]) {
    console.log('Unauthorized socket connection');
    return socket.disconnect(true);
  }

  const username = session.user;
  const userIcon = users[username].icon;

  socket.emit('chat history', messageHistory);

  socket.on('chat message', (msg) => {
    const fullMsg = {
      user: username,
      icon: userIcon,
      text: msg
    };
    messageHistory.push(fullMsg);

    if (messageHistory.length > 100) {
      messageHistory.shift();
    }

    io.emit('chat message', fullMsg);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
