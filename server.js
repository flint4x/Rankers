const express = require('express');
const session = require('express-session');
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
app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
}));

// Serve static files (like your chat UI)
app.use(express.static(path.join(__dirname, 'public')));

// Store messages in memory (for now)
const messageHistory = [];

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    req.session.user = username; // Store username in session
    return res.redirect('/chat.html');
  }
  return res.redirect('/login.html');
});

// Protect the chat page with a session check
app.get('/chat.html', (req, res) => {
  if (req.session.user) {
    return res.sendFile(path.join(__dirname, 'public', 'chat.html'));
  } else {
    return res.redirect('/login.html');
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  // Access the session from the request object
  const username = socket.request.headers.cookie
    .split(';')
    .find(cookie => cookie.trim().startsWith('connect.sid='))
    ?.split('=')[1]; // Extract session ID from cookie

  if (!username) {
    return socket.disconnect(true); // Disconnect if no session or user found
  }

  // Send chat history to the newly connected user
  socket.emit('chat history', messageHistory);

  // Handle incoming chat messages
  socket.on('chat message', (msg) => {
    const fullMsg = { user: username, text: msg };
    messageHistory.push(fullMsg);

    // Limit the message history to 100 messages to avoid memory issues
    if (messageHistory.length > 100) {
      messageHistory.shift();
    }

    // Broadcast the message to all connected users
    io.emit('chat message', fullMsg);
  });
});

// Set up the server to listen on a port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
