const InterviewSession = require('../models/InterviewSession');

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`⚡ WebSocket client connected: ${socket.id}`);

    // Join collaborative interview room
    socket.on('join-room', async ({ token, name, role }) => {
      socket.join(token);
      socket.roomToken = token;
      socket.userName = name;
      socket.userRole = role;

      console.log(`🚪 User "${name}" (${role}) joined interview room: ${token}`);

      // Broadcast join notification to other users in the room
      socket.to(token).emit('user-joined', { id: socket.id, name, role });
    });

    // Handle shared notepad real-time synchronization
    socket.on('notepad-change', async ({ token, content }) => {
      // Save progress to database asynchronously to prevent lag
      InterviewSession.update(
        { notepadContent: content },
        { where: { joinToken: token } }
      ).catch(err => console.error('Failed to sync notepad db state:', err.message));

      // Broadcast update to all other room participants
      socket.to(token).emit('notepad-update', { content });
    });

    // Handle shared code editor content synchronization (Next Phase Integration)
    socket.on('code-change', async ({ token, content, language }) => {
      InterviewSession.update(
        { codeContent: content, codeLanguage: language },
        { where: { joinToken: token } }
      ).catch(err => console.error('Failed to sync code db state:', err.message));

      socket.to(token).emit('code-update', { content, language });
    });

    // Handle cursor and highlighted text selection telemetry
    socket.on('cursor-move', ({ token, cursorPosition, selectionRange, name }) => {
      socket.to(token).emit('cursor-update', {
        id: socket.id,
        cursorPosition,
        selectionRange,
        name
      });
    });

    // Handle real-time WebRTC Peer-to-Peer Voice Signaling
    socket.on('webrtc-offer', ({ token, offer }) => {
      socket.to(token).emit('webrtc-offer', { id: socket.id, offer });
    });

    socket.on('webrtc-answer', ({ token, answer }) => {
      socket.to(token).emit('webrtc-answer', { id: socket.id, answer });
    });

    socket.on('webrtc-candidate', ({ token, candidate }) => {
      socket.to(token).emit('webrtc-candidate', { id: socket.id, candidate });
    });

    // Broadcast session management commands (Extend / End)
    socket.on('session-ended', ({ token }) => {
      io.to(token).emit('session-ended');
    });

    socket.on('session-extended', ({ token, newEnd }) => {
      io.to(token).emit('session-extended', { newEnd });
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      if (socket.roomToken) {
        console.log(`🚪 Client disconnected from room: ${socket.roomToken} (${socket.userName})`);
        socket.to(socket.roomToken).emit('user-left', {
          id: socket.id,
          name: socket.userName,
          role: socket.userRole
        });
      }
    });
  });
};

module.exports = { initSocket };
