// A simple and direct socket handler for real-time collaboration
import { Server } from "socket.io";

// Store active rooms with their users and content
const activeRooms = new Map();

// Print room information - useful for debugging
const logRoomInfo = (room, roomId) => {
  console.log(`[SimpleCollab Debug] Room ${roomId} info:`, {
    userCount: room.users.length,
    users: room.users.map(u => ({ id: u.socketId, name: u.username }))
  });
};

// Initialize the socket server with direct handlers
export const initSimpleCollabSocket = (server, existingIo = null) => {
  console.log("Initializing simple collab socket server...");
  
  // Use existing io instance if provided, otherwise create a new one
  const io = existingIo || new Server(server, {
    cors: {
      origin: "*", // Allow all origins (for development)
      methods: ["GET", "POST"],
      credentials: true
    },
    maxHttpBufferSize: 1e8, // 100 MB max for large code files
  });
  
  // Handle socket connections
  io.on("connection", (socket) => {
    console.log(`[SimpleCollab] New connection: ${socket.id}`);
    
    let currentRoom = null;
    let currentUser = null;
    
    // Join a room
    socket.on("join-room", ({ roomId, username }) => {
      console.log(`[SimpleCollab] ${username} (${socket.id}) joining room: ${roomId}`);
      
      // Save current room and username
      currentRoom = roomId;
      currentUser = username || "Anonymous";
      
      // Join the room
      socket.join(roomId);
      
      // Initialize room if it doesn't exist
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          users: [],
          content: "// Start coding here..."
        });
      }
      
      const room = activeRooms.get(roomId);
      
      // Check if user already exists (handle reconnections)
      const existingUserIndex = room.users.findIndex(
        u => u.username === username || u.socketId === socket.id
      );
      
      if (existingUserIndex >= 0) {
        // Update existing user
        room.users[existingUserIndex].socketId = socket.id;
        console.log(`[SimpleCollab] Updated existing user: ${username}`);
      } else {
        // Add new user
        room.users.push({
          socketId: socket.id,
          username: username || "Anonymous"
        });
        console.log(`[SimpleCollab] Added new user: ${username}`);
      }
      
      // Log room info to debug user tracking
      logRoomInfo(room, roomId);
      
      // Send current users to everyone in the room
      io.to(roomId).emit("room-users", room.users);
      
      // Also emit to this specific socket to ensure it gets the user list
      socket.emit("room-users", room.users);
      
      // Send current content to the new user
      socket.emit("load-document", room.content);
      
      console.log(`[SimpleCollab] Room ${roomId} has ${room.users.length} users`);
    });
    
    // Get current room users
    socket.on("get-room-users", ({ roomId }) => {
      if (!roomId || !activeRooms.has(roomId)) {
        socket.emit("room-users", []);
        return;
      }
      
      const room = activeRooms.get(roomId);
      socket.emit("room-users", room.users);
      console.log(`[SimpleCollab] Sent room users to ${socket.id} for room ${roomId}`);
      logRoomInfo(room, roomId);
    });
    
    // Handle code updates
    socket.on("code-update", (data) => {
      const { roomId, code, sender } = data;
      
      if (!roomId || !code) {
        return;
      }
      
      console.log(`[SimpleCollab] Code update from ${sender || socket.id} in room ${roomId}`);
      
      // Update room content
      if (activeRooms.has(roomId)) {
        activeRooms.get(roomId).content = code;
      }
      
      // Broadcast to ALL clients in the room, not just others
      // This ensures everyone stays in sync
      io.to(roomId).emit("code-update", {
        code: code,
        sender: sender || socket.id
      });
    });
    
    // For compatibility with EditorPage.js that might be using code-change
    socket.on("code-change", (data) => {
      const { roomId, content, sender } = data;
      
      if (!roomId || !content) {
        return;
      }
      
      console.log(`[SimpleCollab] Code change from ${sender || socket.id} in room ${roomId}`);
      
      // Update room content
      if (activeRooms.has(roomId)) {
        activeRooms.get(roomId).content = content;
      }
      
      // Broadcast to ALL clients in the room
      io.to(roomId).emit("code-change", {
        content: content,
        sender: sender || socket.id
      });
      
      // Also emit as code-update for compatibility
      io.to(roomId).emit("code-update", {
        code: content,
        sender: sender || socket.id
      });
    });
    
    // Handle leave-room event
    socket.on("leave-room", ({ roomId }) => {
      if (roomId && activeRooms.has(roomId)) {
        socket.leave(roomId);
        console.log(`[SimpleCollab] User ${currentUser} left room ${roomId}`);
        
        const room = activeRooms.get(roomId);
        if (room) {
          // Remove user from the room
          room.users = room.users.filter(user => user.socketId !== socket.id);
          
          // Update room users for everyone
          io.to(roomId).emit("room-users", room.users);
          
          logRoomInfo(room, roomId);
          
          // Clean up empty rooms
          if (room.users.length === 0) {
            activeRooms.delete(roomId);
            console.log(`[SimpleCollab] Room ${roomId} is now empty and was removed`);
          }
        }
      }
    });
    
    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`[SimpleCollab] Socket disconnected: ${socket.id}`);
      
      if (currentRoom) {
        // Remove user from room
        const room = activeRooms.get(currentRoom);
        
        if (room) {
          // Store the original count to detect if a user was removed
          const originalCount = room.users.length;
          
          // Remove the disconnected user
          room.users = room.users.filter(user => user.socketId !== socket.id);
          
          // Log if user was actually removed
          if (originalCount !== room.users.length) {
            console.log(`[SimpleCollab] Removed user ${currentUser} from room ${currentRoom}`);
          } else {
            console.log(`[SimpleCollab] User ${currentUser} not found in room ${currentRoom} users list`);
          }
          
          // Log room info to debug user tracking
          logRoomInfo(room, currentRoom);
          
          // Update user list for remaining users
          io.to(currentRoom).emit("room-users", room.users);
          
          console.log(`[SimpleCollab] ${currentUser} left room ${currentRoom}. Remaining users: ${room.users.length}`);
          
          // Clean up empty rooms
          if (room.users.length === 0) {
            activeRooms.delete(currentRoom);
            console.log(`[SimpleCollab] Room ${currentRoom} is now empty and was removed`);
          }
        }
      }
    });
  });
  
  return io;
}; 