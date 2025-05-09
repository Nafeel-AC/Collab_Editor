const socketIo = require('socket.io');

// Store active rooms and their users
const rooms = {};

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Extract roomId and username from query params
    const { roomId, username } = socket.handshake.query;
    
    // Join the specified room
    socket.on('join-room', ({ roomId, username }) => {
      console.log(`${username} joining room: ${roomId}`);
      
      // Join the room
      socket.join(roomId);
      
      // Initialize room if it doesn't exist
      if (!rooms[roomId]) {
        rooms[roomId] = {
          users: []
        };
      }
      
      // Add user to the room
      rooms[roomId].users.push({
        id: socket.id,
        username
      });
      
      // Emit the updated user list to all clients in the room
      io.to(roomId).emit('room-users', rooms[roomId].users);
      
      console.log(`Room ${roomId} now has ${rooms[roomId].users.length} users`);
    });
    
    // Handle code updates
    socket.on('code-update', (data) => {
      // Broadcast the code update to all users in the room
      socket.to(data.roomId).emit('code-update', data);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Find which room this socket was in
      Object.keys(rooms).forEach((roomId) => {
        const room = rooms[roomId];
        const userIndex = room.users.findIndex(user => user.id === socket.id);
        
        // If user was found in this room
        if (userIndex !== -1) {
          // Remove user from the room
          const user = room.users[userIndex];
          room.users.splice(userIndex, 1);
          
          console.log(`${user.username} left room: ${roomId}`);
          
          // If room is now empty, clean it up
          if (room.users.length === 0) {
            console.log(`Room ${roomId} is now empty, cleaning up`);
            delete rooms[roomId];
          } else {
            // Update the user list for remaining users
            io.to(roomId).emit('room-users', room.users);
          }
        }
      });
    });
  });
  
  return io;
};

module.exports = setupSocket; 