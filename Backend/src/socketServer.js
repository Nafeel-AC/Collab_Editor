import { Server } from "socket.io";
import {
  addParticipant,
  removeParticipant,
  getRoomParticipants,
  getRoomDocument,
  updateRoomDocument
} from "./controllers/room.controller.js";
import { Room } from "./models/room.model.js";
import { File } from "./models/file.model.js";

let io;

// Store connected users by room
const roomUsers = new Map();

export const initSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: true, // Allow all origins for testing
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000, // Increase ping timeout to prevent premature disconnections
    connectTimeout: 30000,
    maxHttpBufferSize: 1e8, // 100 MB max for large code files
  });

  // Connection middleware to log connections
  io.use(async (socket, next) => {
    console.log(`Socket attempting connection: ${socket.id}`);
    next();
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Send immediate confirmation to client
    socket.emit('connected', { socketId: socket.id });
    
    // Track active rooms for this socket
    const activeRooms = new Set();

    // Store user's current room
    let currentRoom = null;
    let username = "Anonymous";

    // Handle joining a room
    socket.on("join-room", async ({ roomId, username: joinUsername }) => {
      try {
        // Check if room exists
        const room = await Room.findOne({ roomId });
        
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }
        
        // Leave current room if any
        if (currentRoom) {
          socket.leave(currentRoom);
          removeUserFromRoom(currentRoom, socket.id);
        }
        
        // Set the username
        username = joinUsername || "Anonymous";
        
        // Clean up: Remove any existing socket connections with the same username
        // This helps when users reload the page
        const existingUsers = getRoomUsers(roomId);
        const duplicateUser = existingUsers.find(user => 
          user.username === username && user.socketId !== socket.id
        );
        
        if (duplicateUser) {
          console.log(`Found duplicate user ${username} in room ${roomId}, cleaning up old connection`);
          removeUserFromRoom(roomId, duplicateUser.socketId);
        }
        
        // Join new room
        socket.join(roomId);
        currentRoom = roomId;
        
        // Add user to room users with clean handling of duplicates
        addUserToRoom(roomId, socket.id, username);
        
        // Update all clients with new user list
        const updatedUsers = getRoomUsers(roomId);
        io.to(roomId).emit("room-users", updatedUsers);
        
        console.log(`User ${socket.id} (${username}) joined room ${roomId}. Total users: ${updatedUsers.length}`);
        
      } catch (error) {
        console.error("Error joining room:", error);
        socket.emit("error", { message: "Error joining room" });
      }
    });

    // Handle fetching document
    socket.on("get-document", async ({ roomId }) => {
      try {
        console.log(`User ${socket.id} requested document for room: ${roomId}`);
        // Get the document from the database
        const doc = await getRoomDocument(roomId);
        
        if (doc) {
          console.log(`Sending document for room ${roomId} to user ${socket.id}`);
          socket.emit("load-document", doc);
        } else {
          console.log(`No document found for room ${roomId}, sending default`);
          socket.emit("load-document", { 
            document: "// Start coding here...", 
            language: "javascript" 
          });
        }
      } catch (error) {
        console.error("Error getting document:", error);
        socket.emit("error", { message: "Failed to get document" });
      }
    });

    // Handle code changes
    socket.on("code-change", ({ roomId, content, sender, fileId }) => {
      // Broadcast to all clients in the room except the sender
      socket.to(roomId).emit("code-change", { 
        content, 
        sender, 
        fileId 
      });
    });

    // Handle language changes
    socket.on("language-change", ({ roomId, language, fileId }) => {
      socket.to(roomId).emit("language-change", { language, fileId });
    });

    // Handle document saving
    socket.on("save-document", async ({ roomId, document, fileId }) => {
      try {
        if (!fileId) {
          console.log("No fileId provided for save-document, skipping");
          return;
        }
        
        // Update file in database
        await File.findByIdAndUpdate(fileId, { 
          content: document 
        });
        
        console.log(`Document saved for file ${fileId} in room ${roomId}`);
      } catch (error) {
        console.error("Error saving document:", error);
        socket.emit("error", { message: "Error saving document" });
      }
    });

    // Handle ping from clients to keep connection alive
    socket.on("ping", () => {
      socket.emit("pong");
    });

    // Handle explicit room leave
    socket.on("leave-room", async ({ roomId }) => {
      try {
        if (roomId) {
          socket.leave(roomId);
          activeRooms.delete(roomId);
          await removeParticipant(socket.id);
          
          // Update participants for the room
          const participants = await getRoomParticipants(roomId);
          io.to(roomId).emit("room-users", participants.map(p => ({ 
            socketId: p.socketId, 
            username: p.username 
          })));
        }
      } catch (error) {
        console.error("Error leaving room:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", async (reason) => {
      console.log(`User disconnected: ${socket.id}. Reason: ${reason}`);
      
      try {
        // Remove participant from all rooms
        await removeParticipant(socket.id);
        
        // Update participants for each active room this socket was in
        for (const roomId of activeRooms) {
          const participants = await getRoomParticipants(roomId);
          io.to(roomId).emit("room-users", participants.map(p => ({ 
            socketId: p.socketId, 
            username: p.username 
          })));
        }
      } catch (error) {
        console.error("Error handling disconnection:", error);
      }
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized");
  }
  return io;
};

// Helper function to add user to a room
const addUserToRoom = (roomId, socketId, username) => {
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, []);
  }
  
  const users = roomUsers.get(roomId);
  
  // First, remove any users with the same username but different socket IDs
  // This helps prevent duplicate users when page reloads
  const filteredUsers = users.filter(user => !(user.username === username && user.socketId !== socketId));
  
  // Then check if this exact socket ID already exists
  const existingUserIndex = filteredUsers.findIndex(user => user.socketId === socketId);
  
  if (existingUserIndex !== -1) {
    // Update existing user
    filteredUsers[existingUserIndex].username = username;
  } else {
    // Add new user
    filteredUsers.push({ socketId, username });
  }
  
  // Update the room users
  roomUsers.set(roomId, filteredUsers);
  
  console.log(`Room ${roomId} users updated:`, filteredUsers);
}

// Helper function to remove user from a room
const removeUserFromRoom = (roomId, socketId) => {
  if (!roomUsers.has(roomId)) return;
  
  const users = roomUsers.get(roomId);
  const filteredUsers = users.filter(user => user.socketId !== socketId);
  
  if (filteredUsers.length === 0) {
    // Remove room if empty
    roomUsers.delete(roomId);
  } else {
    roomUsers.set(roomId, filteredUsers);
  }
}

// Helper function to get users in a room
const getRoomUsers = (roomId) => {
  return roomUsers.has(roomId) ? roomUsers.get(roomId) : [];
} 