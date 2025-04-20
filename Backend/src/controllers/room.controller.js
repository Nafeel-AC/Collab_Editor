import { Room } from "../models/room.model.js";
import { v4 as uuidv4 } from "uuid";

// Generate a unique room ID
const generateUniqueRoomId = () => {
  return uuidv4().substring(0, 8);
};

// Create a new room
export const createRoom = async (req, res) => {
  try {
    console.log("Create room request received:", req.body);
    
    const { createdBy } = req.body;
    
    if (!createdBy) {
      console.log("Username not provided in room creation");
      return res.status(400).json({ message: "Username is required" });
    }
    
    // Generate a unique roomId
    const roomId = generateUniqueRoomId();
    console.log(`Generated room ID: ${roomId} for user: ${createdBy}`);
    
    // Create a new room
    const room = new Room({
      roomId,
      createdBy,
      document: '// Start coding here...',
      language: 'javascript',
      participants: []
    });
    
    console.log("Saving room to database...");
    await room.save();
    console.log(`Room saved successfully with ID: ${roomId}`);
    
    res.status(201).json({ 
      message: "Room created successfully", 
      roomId: room.roomId 
    });
  } catch (error) {
    console.error("Error creating room:", error);
    
    // Check for duplicate key error
    if (error.code === 11000) {
      // If there's a duplicate key error, try again with a new room ID
      console.log("Duplicate room ID detected, generating a new one...");
      
      try {
        const newRoomId = generateUniqueRoomId();
        const newRoom = new Room({
          roomId: newRoomId,
          createdBy: req.body.createdBy,
          document: '// Start coding here...',
          language: 'javascript',
          participants: []
        });
        
        await newRoom.save();
        
        return res.status(201).json({
          message: "Room created successfully after retry",
          roomId: newRoom.roomId
        });
      } catch (retryError) {
        console.error("Error on retry:", retryError);
        return res.status(500).json({
          message: "Failed to create room even after retry",
          error: retryError.message
        });
      }
    }
    
    // For other errors
    res.status(500).json({ 
      message: "Failed to create room",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get room details
export const getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`Getting details for room: ${roomId}`);
    
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      console.log(`Room not found: ${roomId}`);
      return res.status(404).json({ message: "Room not found" });
    }
    
    console.log(`Room found: ${roomId}`);
    res.status(200).json({ 
      roomId: room.roomId,
      language: room.language,
      createdBy: room.createdBy,
      createdAt: room.createdAt,
      lastActive: room.lastActive,
      participantCount: room.participants.length
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({ message: "Failed to fetch room details", error: error.message });
  }
};

// Update room document
export const updateRoomDocument = async (roomId, document, language) => {
  try {
    console.log(`Updating document for room: ${roomId}`);
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      console.log(`Room not found for document update: ${roomId}`);
      return false;
    }
    
    room.document = document;
    if (language) {
      room.language = language;
    }
    room.lastActive = new Date();
    
    await room.save();
    console.log(`Document updated for room: ${roomId}`);
    return true;
  } catch (error) {
    console.error("Error updating room document:", error);
    return false;
  }
};

// Add participant to room
export const addParticipant = async (roomId, socketId, username) => {
  try {
    console.log(`Adding participant ${username} (${socketId}) to room: ${roomId}`);
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      console.log(`Room not found for adding participant: ${roomId}`);
      return false;
    }
    
    // Check if participant already exists
    const existingParticipant = room.participants.find(p => p.username === username);
    
    if (existingParticipant) {
      // Update socketId if participant exists
      console.log(`Updating existing participant ${username} in room: ${roomId}`);
      existingParticipant.socketId = socketId;
      existingParticipant.joinedAt = new Date();
    } else {
      // Add new participant
      console.log(`Adding new participant ${username} to room: ${roomId}`);
      room.participants.push({
        socketId,
        username,
        joinedAt: new Date()
      });
    }
    
    room.lastActive = new Date();
    await room.save();
    console.log(`Participant ${username} successfully added/updated in room: ${roomId}`);
    return true;
  } catch (error) {
    console.error("Error adding participant:", error);
    return false;
  }
};

// Remove participant from room
export const removeParticipant = async (socketId) => {
  try {
    console.log(`Removing participant with socket ID: ${socketId}`);
    const rooms = await Room.find({ "participants.socketId": socketId });
    
    if (rooms.length === 0) {
      console.log(`No rooms found with participant socket ID: ${socketId}`);
      return true;
    }
    
    for (const room of rooms) {
      console.log(`Removing participant from room: ${room.roomId}`);
      room.participants = room.participants.filter(p => p.socketId !== socketId);
      await room.save();
    }
    
    console.log(`Participant removed from ${rooms.length} rooms`);
    return true;
  } catch (error) {
    console.error("Error removing participant:", error);
    return false;
  }
};

// Get room participants
export const getRoomParticipants = async (roomId) => {
  try {
    console.log(`Getting participants for room: ${roomId}`);
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      console.log(`Room not found for getting participants: ${roomId}`);
      return [];
    }
    
    console.log(`Found ${room.participants.length} participants in room: ${roomId}`);
    return room.participants;
  } catch (error) {
    console.error("Error getting room participants:", error);
    return [];
  }
};

// Get room document
export const getRoomDocument = async (roomId) => {
  try {
    console.log(`Getting document for room: ${roomId}`);
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      console.log(`Room not found for getting document: ${roomId}`);
      return null;
    }
    
    console.log(`Document found for room: ${roomId}`);
    return {
      document: room.document,
      language: room.language
    };
  } catch (error) {
    console.error("Error getting room document:", error);
    return null;
  }
}; 