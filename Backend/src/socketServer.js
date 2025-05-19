import {
  addParticipant,
  removeParticipant,
  getRoomParticipants,
  getRoomDocument,
  updateRoomDocument
} from "./controllers/room.controller.js";
import { Room } from "./models/room.model.js";
import { File } from "./models/file.model.js";
import { User } from "./models/user.model.js";
import { Message } from "./models/message.model.js";

let mainIo;

// Store connected users by room
const roomUsers = new Map();

// Store connected users by user ID
const connectedUsers = new Map();

export const initSocketServer = (io) => {
  mainIo = io; // Store the io instance

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
    let userId = null;

    // User authentication and tracking
    socket.on("authenticate", ({ token, userId: authUserId }) => {
      try {
        if (!authUserId) {
          console.log("No user ID provided for authentication");
          socket.emit("error", { message: "No user ID provided for authentication" });
          return;
        }
        
        userId = authUserId;
        
        // Store socket ID by user ID for direct messaging
        // If user already has a connected socket, disconnect the old one
        const existingSocketId = connectedUsers.get(userId);
        if (existingSocketId && existingSocketId !== socket.id) {
          console.log(`User ${userId} already has a connected socket: ${existingSocketId}. Updating to new socket: ${socket.id}`);
          // We don't forcibly disconnect as the user might have multiple tabs open
        }
        
        connectedUsers.set(userId, socket.id);
        
        console.log(`User authenticated: ${userId} with socket: ${socket.id}`);
        
        // Join a private room for this user
        socket.join(`user:${userId}`);
        
        // Send confirmation back to client
        socket.emit("authenticated", { userId });
        
        // Debug: Log all authenticated users
        console.log("Currently connected users:", Array.from(connectedUsers.entries()));
      } catch (error) {
        console.error("Authentication error:", error);
        socket.emit("error", { message: "Authentication failed" });
      }
    });

    // Handle joining a room
    socket.on("join-room", async ({ roomId, username: joinUsername, isExistingProject, projectId, createNewRoom, forceCreateRoom }) => {
      try {
        console.log(`JOIN ROOM REQUEST:`, { 
          roomId, 
          username: joinUsername, 
          isExistingProject: !!isExistingProject, 
          projectId, 
          createNewRoom: !!createNewRoom,
          forceCreateRoom: !!forceCreateRoom
        });
        
        // Input validation
        if (!roomId || typeof roomId !== 'string') {
          console.error(`Invalid roomId:`, roomId);
          socket.emit("join-room-error", { message: "Invalid room ID" });
          return;
        }
        
        let room;
        
        // If this is an existing project being opened in a new room or if createNewRoom/forceCreateRoom is set
        if (isExistingProject || createNewRoom || forceCreateRoom) {
          try {
            console.log(`Using findOrCreateRoom for ${roomId} (project: ${projectId || 'unknown'})`);
            // Use the reliable method to find or create the room
            // Check if Room.findOrCreateRoom method exists
            if (typeof Room.findOrCreateRoom !== 'function') {
              console.error('Room.findOrCreateRoom is not available - attempting fallback');
              // Fallback implementation
              room = await Room.findOne({ roomId });
              if (!room) {
                console.log(`Room ${roomId} not found, creating it...`);
                room = new Room({
                  roomId,
                  createdBy: 'system',
                  createdAt: new Date(),
                  lastActive: new Date()
                });
                await room.save();
              }
            } else {
              // Use the proper method
              room = await Room.findOrCreateRoom(roomId);
            }
          } catch (roomError) {
            console.error(`Error finding/creating room:`, roomError);
            socket.emit("join-room-error", { 
              message: `Failed to create room: ${roomError.message}`,
              details: roomError.toString()
            });
            return;
          }
        } else {
          // Just find the room without creating it for normal room joins
          room = await Room.findOne({ roomId });
          
          console.log(`Room lookup for ${roomId}: ${room ? 'FOUND' : 'NOT FOUND'}`);
          
          if (!room) {
            // Room doesn't exist and should not be created
            console.log(`Room not found: ${roomId}`);
            socket.emit("room-not-found", { roomId });
            return;
          }
        }
        
        // Leave current room if any
        if (currentRoom) {
          console.log(`User ${socket.id} leaving current room: ${currentRoom}`);
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
        
        // Confirm successful join to the client
        socket.emit("room-joined", { roomId, success: true });
        
      } catch (error) {
        console.error("Error joining room:", error);
        socket.emit("join-room-error", { 
          message: "Error joining room: " + error.message,
          details: error.toString()
        });
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
    socket.on("code-update", ({ roomId, code, content, sender, fileId }) => {
      // Use either code or content, whichever is provided
      const codeContent = code || content;
      
      // Skip if we don't have the necessary data
      if (!roomId || !codeContent) return;
      
      console.log(`User ${socket.id} sent code update for room ${roomId}${fileId ? ` (file ${fileId})` : ''}`);
      
      // Broadcast to all clients in the room except the sender
      socket.to(roomId).emit("code-update", { 
        code: codeContent, 
        content: codeContent, // Include both properties for compatibility
        sender, 
        fileId 
      });
      
      // Also broadcast using the code-change event for compatibility
      socket.to(roomId).emit("code-change", { 
        content: codeContent, 
        code: codeContent, // Include both properties for compatibility
        sender, 
        fileId 
      });
    });

    // Also handle code-change events for compatibility
    socket.on("code-change", ({ roomId, code, content, sender, fileId }) => {
      // Use either code or content, whichever is provided
      const codeContent = code || content;
      
      // Skip if we don't have the necessary data
      if (!roomId || !codeContent) return;
      
      console.log(`User ${socket.id} sent code change for room ${roomId}${fileId ? ` (file ${fileId})` : ''}`);
      
      // Broadcast to all clients in the room except the sender
      socket.to(roomId).emit("code-update", { 
        code: codeContent, 
        content: codeContent, // Include both properties for compatibility
        sender, 
        fileId 
      });
      
      // Also broadcast using the code-change event for compatibility
      socket.to(roomId).emit("code-change", { 
        content: codeContent, 
        code: codeContent, // Include both properties for compatibility
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

    // ======= MESSAGING FUNCTIONALITY =======
    
    // Handle direct message
    socket.on("send-direct-message", async ({ receiverId, message, refId }, callback) => {
      try {
        if (!userId) {
          console.error("Direct message attempted without authentication");
          socket.emit("error", { message: "You must be authenticated to send messages" });
          if (callback) callback({ success: false, error: "You must be authenticated to send messages" });
          return;
        }
        
        if (!receiverId || !message) {
          console.error(`Invalid direct message data: receiverId=${receiverId}, message length=${message ? message.length : 0}`);
          socket.emit("error", { message: "Invalid message data" });
          if (callback) callback({ success: false, error: "Invalid message data" });
          return;
        }
        
        console.log(`User ${userId} sending message to ${receiverId}: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''} (ref: ${refId || 'none'})`);
        
        // First verify the receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          console.error(`Receiver not found in database: ${receiverId}`);
          if (callback) callback({ success: false, error: "Recipient not found" });
          return;
        }
        
        // Store message in database
        const newMessage = new Message({
          sender: userId,
          receiver: receiverId,
          text: message,
          refId: refId || null, // Store reference ID if provided
        });
        
        const savedMessage = await newMessage.save();
        console.log(`Message saved to database with ID: ${savedMessage._id}, refId: ${refId || 'none'}`);
        
        // Get sender info
        const sender = await User.findById(userId);
        if (!sender) {
          console.error(`Sender not found in database: ${userId}`);
          socket.emit("error", { message: "Sender not found" });
          if (callback) callback({ success: false, error: "Sender not found" });
          return;
        }
        
        // Format message for sending - ensure consistent format for both sender and receiver
        const formattedMessage = {
          id: savedMessage._id.toString(), // Convert ObjectId to string for consistency
          senderId: userId,
          senderName: sender.userName || "Unknown User", // Fallback if username missing
          receiverId: receiverId,
          text: message,
          timestamp: savedMessage.createdAt,
          refId: refId || null, // Include reference ID if provided
          read: false,
          pending: false // Mark as confirmed message since it's saved in DB
        };
        
        console.log(`Formatted message: ${JSON.stringify(formattedMessage)}`);
        
        // Send confirmation to sender with the message ID from database
        socket.emit("receive-direct-message", formattedMessage);
        console.log(`Message confirmation sent back to sender: ${userId}`);
        
        // Check if receiver is online
        const receiverSocketId = connectedUsers.get(receiverId);
        
        if (receiverSocketId) {
          // Recipient is online, send to their room
          console.log(`Attempting to deliver message to user:${receiverId} (socket: ${receiverSocketId})`);
          
          // Use io.to() to send to a room
          io.to(`user:${receiverId}`).emit("receive-direct-message", formattedMessage);
          
          // Also try a direct socket delivery as backup
          const receiverSocket = io.sockets.sockets.get(receiverSocketId);
          if (receiverSocket) {
            receiverSocket.emit("receive-direct-message", formattedMessage);
            console.log(`Message also sent directly to socket ${receiverSocketId}`);
          } else {
            console.log(`Socket ${receiverSocketId} not found in active sockets`);
          }
          
          console.log(`Message sent to online user ${receiverId} via room user:${receiverId}`);
        } else {
          console.log(`User ${receiverId} is offline, message saved to database only`);
        }
        
        // Send acknowledgment to caller if callback provided
        if (callback) {
          callback({ 
            success: true, 
            messageId: savedMessage._id.toString(),
            timestamp: savedMessage.createdAt
          });
        }
      } catch (error) {
        console.error("Error sending direct message:", error);
        socket.emit("error", { message: "Failed to send message", details: error.message });
        
        // If there was a refId, send an error notification for the specific message
        if (refId) {
          socket.emit("message-error", { refId, error: error.message });
        }
        
        // Send error via callback if provided
        if (callback) {
          callback({ success: false, error: error.message || "Failed to send message" });
        }
      }
    });
    
    // Handle message read status
    socket.on("mark-messages-read", async ({ senderId }) => {
      try {
        if (!userId) {
          socket.emit("error", { message: "You must be authenticated to mark messages" });
          return;
        }
        
        // Update read status in database
        await Message.updateMany(
          { sender: senderId, receiver: userId, read: false },
          { read: true }
        );
        
        console.log(`Messages from ${senderId} to ${userId} marked as read`);
        
        // Notify sender that messages were read
        const senderSocketId = connectedUsers.get(senderId);
        if (senderSocketId) {
          io.to(`user:${senderId}`).emit("messages-read", { by: userId });
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
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

    // Handle room closure (notify all users)
    socket.on("close-room", async ({ roomId, username, savedProject }) => {
      try {
        console.log(`User ${username} (${socket.id}) is closing room ${roomId}. Project saved: ${savedProject ? 'Yes' : 'No'}`);
        
        // Notify all users in the room that it's being closed
        io.to(roomId).emit("room-closed", { 
          roomId,
          closedBy: username,
          savedProject,
          message: `Room closed by ${username}${savedProject ? ' (project saved)' : ' (without saving)'}`
        });
        
        // Mark room as inactive in database if needed
        try {
          await Room.findOneAndUpdate(
            { roomId },
            { active: false, updatedAt: new Date() }
          );
          console.log(`Room ${roomId} marked as inactive in database`);
        } catch (dbError) {
          console.error(`Error updating room status:`, dbError);
        }
      } catch (error) {
        console.error("Error closing room:", error);
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
        
        // Remove from connected users map
        if (userId) {
          connectedUsers.delete(userId);
          console.log(`User ${userId} removed from connected users map`);
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
  if (!mainIo) {
    throw new Error("Socket.io has not been initialized");
  }
  return mainIo;
};

// Helper function to add user to a room
const addUserToRoom = (roomId, socketId, username) => {
  if (!roomId || !socketId) {
    console.log(`Missing required parameters to add user to room. roomId: ${roomId}, socketId: ${socketId}`);
    return;
  }
  
  // Initialize room if it doesn't exist
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, []);
  }
  
  // Check if user already exists in this room (handle page refreshes)
  const room = roomUsers.get(roomId);
  const existingUserIndex = room.findIndex(u => 
    u.socketId === socketId || u.username === username
  );
  
  if (existingUserIndex >= 0) {
    // Update existing user's socket ID (useful for reconnections)
    room[existingUserIndex] = { socketId, username };
    console.log(`Updated user ${username} in room ${roomId}`);
  } else {
    // Add new user to room
    room.push({ socketId, username });
    console.log(`Added user ${username} to room ${roomId}`);
  }
  
  // Broadcast updated user list
  mainIo.to(roomId).emit('room-users', room);
};

// Helper function to remove user from a room
const removeUserFromRoom = (roomId, socketId) => {
  if (!roomId || !socketId || !roomUsers.has(roomId)) {
    return;
  }
  
  const room = roomUsers.get(roomId);
  const newRoomUsers = room.filter(user => user.socketId !== socketId);
  
  if (newRoomUsers.length !== room.length) {
    roomUsers.set(roomId, newRoomUsers);
    
    // If room is now empty, clean up
    if (newRoomUsers.length === 0) {
      roomUsers.delete(roomId);
    } else {
      // Notify remaining users
      mainIo.to(roomId).emit('room-users', newRoomUsers);
    }
  }
};

// Helper function to get users in a room
const getRoomUsers = (roomId) => {
  return roomUsers.get(roomId) || [];
}; 