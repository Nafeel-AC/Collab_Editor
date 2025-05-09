import { addParticipant, removeParticipant, getRoomParticipants, updateRoomDocument } from "./controllers/room.controller.js";
import { Room } from "./models/room.model.js";
import { File } from "./models/file.model.js";

// Initialize a Socket.IO namespace for collaborative editing
export const initCollabSocket = (io) => {
  // Create a namespace for collaboration
  const collabNamespace = io.of('/collab');

  // Log all connection attempts
  collabNamespace.use(async (socket, next) => {
    console.log(`[Collab] New socket connection attempt: ${socket.id}`);
    next();
  });

  // Handle connections
  collabNamespace.on("connection", (socket) => {
    console.log(`[Collab] Client connected: ${socket.id}`);
    
    // Extract data from query params
    const { roomId, username } = socket.handshake.query;
    console.log(`[Collab] Connection params - Room: ${roomId}, User: ${username || 'Anonymous'}`);
    
    // Send immediate confirmation to client
    socket.emit('connected', { socketId: socket.id });

    // Join a room
    socket.on("join-room", async ({ roomId, username: joinUsername }) => {
      try {
        if (!roomId) {
          socket.emit("error", { message: "Room ID is required" });
          return;
        }

        const user = joinUsername || "Anonymous";
        console.log(`[Collab] ${user} joining room: ${roomId}`);
        
        // Join the socket.io room
        socket.join(roomId);
        
        // Add participant to the room in database
        await addParticipant(roomId, socket.id, user);
        
        // Get updated participants list
        const participants = await getRoomParticipants(roomId);
        
        // Broadcast the updated participants list to all clients in the room
        collabNamespace.to(roomId).emit("room-users", participants);
        
        console.log(`[Collab] ${user} joined room ${roomId}. Total users: ${participants.length}`);
      } catch (error) {
        console.error("[Collab] Error joining room:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Handle code updates
    socket.on("code-update", async (data) => {
      try {
        const { roomId, code, fileId, sender } = data;
        
        // Skip if data is incomplete
        if (!roomId || !code) {
          return;
        }
        
        // Only broadcast to others in the room (not back to sender)
        socket.to(roomId).emit("code-update", { 
          code, 
          sender,
          fileId
        });
        
        // If there's a fileId, update the file in the database
        if (fileId) {
          try {
            await File.findByIdAndUpdate(fileId, { content: code });
          } catch (error) {
            console.error(`[Collab] Error updating file ${fileId}:`, error);
          }
        } else {
          // Update the room document in the database if no specific file
          await updateRoomDocument(roomId, code);
        }
      } catch (error) {
        console.error("[Collab] Error handling code update:", error);
      }
    });

    // Handle language changes
    socket.on("language-change", async (data) => {
      try {
        const { roomId, language, fileId } = data;
        
        // Skip if data is incomplete
        if (!roomId || !language) {
          return;
        }
        
        // Broadcast language change to all clients in the room except sender
        socket.to(roomId).emit("language-change", { language, fileId });
        
        // Update room language in database
        if (!fileId) {
          // Only update room language if it's not a specific file
          await updateRoomDocument(roomId, null, language);
        }
      } catch (error) {
        console.error("[Collab] Error handling language change:", error);
      }
    });
    
    // Handle disconnection
    socket.on("disconnect", async () => {
      console.log(`[Collab] Client disconnected: ${socket.id}`);
      
      try {
        // Find rooms this socket was in
        const rooms = await Room.find({ "participants.socketId": socket.id });
        
        // Remove the participant from all rooms
        await removeParticipant(socket.id);
        
        // For each room, notify remaining participants
        for (const room of rooms) {
          const updatedParticipants = await getRoomParticipants(room.roomId);
          collabNamespace.to(room.roomId).emit("room-users", updatedParticipants);
          console.log(`[Collab] Notified ${updatedParticipants.length} users in room ${room.roomId} about departure`);
        }
      } catch (error) {
        console.error("[Collab] Error handling disconnect:", error);
      }
    });
  });

  return collabNamespace;
};

export default initCollabSocket; 