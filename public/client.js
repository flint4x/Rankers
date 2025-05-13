const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

// Handle chat history
socket.on('chat history', (history) => {
  messages.innerHTML = '';
  history.forEach((msg) => {
    addMessage(msg);
  });
});

// Handle new messages
socket.on('chat message', (msg) => {
  addMessage(msg);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
  }
});

function addMessage(msg) {
  const item = document.createElement('li');
  item.innerHTML = `<strong>${msg.user}</strong>: ${msg.text}`;
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}
