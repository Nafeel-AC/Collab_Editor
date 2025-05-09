import { Room } from "../models/room.model.js";
import { v4 as uuidv4 } from "uuid";
import { User } from '../models/user.model.js';

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
    
    const now = new Date();
    
    // Create a new room
    const room = new Room({
      roomId,
      createdBy,
      document: '// Start coding here...',
      language: 'javascript',
      participants: [],
      createdAt: now,
      lastActive: now,
      isActive: true
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
        const now = new Date();
        const newRoom = new Room({
          roomId: newRoomId,
          createdBy: req.body.createdBy,
          document: '// Start coding here...',
          language: 'javascript',
          participants: [],
          createdAt: now,
          lastActive: now,
          isActive: true
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
    
    console.log(`Room found: ${roomId}, created by: ${room.createdBy}`);
    
    // Return the full room object along with a formatted response
    res.status(200).json({ 
      room: room,
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
    
    // Set the room as active and update lastActive
    room.isActive = true;
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
    
    // Find all rooms that contain this socketId
    const rooms = await Room.find({ "participants.socketId": socketId });
    
    if (rooms.length === 0) {
      console.log(`No rooms found with participant socket ID: ${socketId}`);
      return true;
    }
    
    const now = new Date();
    
    for (const room of rooms) {
      console.log(`Removing participant from room: ${room.roomId}`);
      
      // Filter out the disconnected participant
      room.participants = room.participants.filter(p => p.socketId !== socketId);
      
      // Update the lastActive timestamp
      room.lastActive = now;
      
      // Save the updated room
      await room.save();
      
      console.log(`Participant removed from room ${room.roomId}. Remaining participants: ${room.participants.length}`);
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

// Join a room
export const joinRoom = async (req, res) => {
  try {
    const { roomId, username } = req.body;
    
    if (!roomId || !username) {
      return res.status(400).json({ message: "Room ID and username are required" });
    }
    
    // Check if room exists
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    
    // Add user to participants list if not already there
    const isParticipant = room.participants.some(p => p.username === username);
    
    if (!isParticipant) {
      room.participants.push({
        username,
        joinedAt: new Date()
      });
      
      await room.save();
    }
    
    // Return room details
    res.status(200).json({
      message: "Joined room successfully",
      roomId: room.roomId,
      language: room.language,
      document: room.document,
      createdBy: room.createdBy,
      participantCount: room.participants.length
    });
  } catch (error) {
    console.error("Error joining room:", error);
    res.status(500).json({ message: "Failed to join room", error: error.message });
  }
};

// Get active rooms (admin only)
export const getActiveRooms = async (req, res) => {
    try {
        console.log('Fetching active rooms for admin');
        
        // Get all rooms and count
        const allRooms = await Room.find().lean();
        console.log(`Total rooms in database: ${allRooms.length}`);
        
        // Calculate time thresholds
        const threeHoursAgo = new Date();
        threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
        
        // Find rooms that are GENUINELY active:
        // 1. isActive flag is true
        // 2. has at least one participant with valid socketId
        // 3. has been active in the last 3 hours
        const activeRooms = await Room.find({
            isActive: true,
            lastActive: { $gte: threeHoursAgo },
            $or: [
                { 'participants.0': { $exists: true } } // Has at least one participant
            ]
        }).lean();
        
        console.log(`Found ${activeRooms.length} genuinely active rooms out of ${allRooms.length} total rooms`);
        
        // Format response
        const formattedRooms = activeRooms.map(room => {
            // Filter out participants without socketId
            const validParticipants = room.participants ? 
                room.participants.filter(p => p.socketId && p.socketId.trim() !== '') : 
                [];
            
            return {
                _id: room._id,
                roomId: room.roomId,
                language: room.language,
                createdAt: room.createdAt,
                lastActive: room.lastActive,
                participants: validParticipants || [],
                createdBy: {
                    userName: room.createdBy
                },
                isActive: true
            };
        });
        
        // Final filter to ensure only rooms with valid participants are shown
        const finalRooms = formattedRooms.filter(room => 
            room.participants.length > 0 || 
            (room.lastActive && new Date(room.lastActive) >= threeHoursAgo)
        );
        
        console.log(`Returning ${finalRooms.length} active rooms after filtering`);
        return res.status(200).json(finalRooms);
    } catch (error) {
        console.error('Error getting active rooms:', error);
        return res.status(500).json({ error: 'Failed to get active rooms' });
    }
};

// Clean up inactive rooms (can be called from admin panel)
export const cleanupInactiveRooms = async (req, res) => {
  try {
    console.log('Admin triggered cleanup of inactive rooms');
    
    // Find all rooms
    const allRooms = await Room.find();
    console.log(`Found ${allRooms.length} total rooms`);
    
    let updatedCount = 0;
    let deactivatedCount = 0;
    let deletedCount = 0;
    
    // Calculate time thresholds
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // Loop through each room
    for (const room of allRooms) {
      const originalParticipantCount = room.participants.length;
      
      // Remove participants without socketId or with empty socketId
      room.participants = room.participants.filter(p => 
        p.socketId && p.socketId.trim() !== ''
      );
      
      // Check if room is inactive (no participants and not active recently)
      const hasParticipants = room.participants.length > 0;
      const isRecentlyActive = room.lastActive && new Date(room.lastActive) > oneHourAgo;
      const isOld = room.lastActive && new Date(room.lastActive) < threeDaysAgo;
      
      // If no participants and not active recently, mark as inactive
      if (!hasParticipants && !isRecentlyActive && room.isActive) {
        room.isActive = false;
        deactivatedCount++;
        console.log(`Marked room ${room.roomId} as inactive`);
      }
      
      // Delete old inactive rooms
      if (isOld && !hasParticipants) {
        await Room.deleteOne({ _id: room._id });
        deletedCount++;
        console.log(`Deleted old inactive room ${room.roomId}`);
        continue; // Skip to next room since this one is deleted
      }
      
      // If we removed participants or changed activity status, save the room
      if (room.participants.length !== originalParticipantCount || deactivatedCount > 0) {
        await room.save();
        updatedCount++;
        console.log(`Cleaned up ${originalParticipantCount - room.participants.length} stale participants from room ${room.roomId}`);
      }
    }
    
    // Return success with count of updated/deleted rooms
    return res.status(200).json({ 
      message: `Cleaned up ${updatedCount} rooms, deactivated ${deactivatedCount} inactive rooms, and deleted ${deletedCount} old rooms`,
      updatedCount,
      deactivatedCount,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up inactive rooms:', error);
    return res.status(500).json({ error: 'Failed to clean up inactive rooms' });
  }
};

// Close a room (host only)
export const closeRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`Closing room: ${roomId}`);
    
    // Find the room
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      console.log(`Room not found: ${roomId}`);
      return res.status(404).json({ message: "Room not found" });
    }
    
    // Clear all participants
    room.participants = [];
    
    // Add a closed flag
    room.isActive = false;
    room.closedAt = new Date();
    
    await room.save();
    console.log(`Room ${roomId} has been closed`);
    
    // Return success
    return res.status(200).json({
      message: "Room closed successfully",
      roomId: room.roomId
    });
  } catch (error) {
    console.error("Error closing room:", error);
    return res.status(500).json({ 
      message: "Failed to close room", 
      error: error.message 
    });
  }
}; 