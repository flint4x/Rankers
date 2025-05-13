const express = require('express');
const session = require('express-session');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const users = require('./users');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (users[username] && users[username] === password) {
    req.session.user = username;
    return res.redirect('/chat.html');
  }

  return res.redirect('/login.html'); // or optionally send error
});

// Middleware to protect chat.html
app.get('/chat.html', (req, res, next) => {
  if (req.session.user) {
    return res.sendFile(path.join(__dirname, 'public', 'chat.html'));
  } else {
    return res.redirect('/login.html');
  }
});

// Socket.io
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
