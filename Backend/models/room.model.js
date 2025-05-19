import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true // Add index for faster lookups
  },
  document: {
    type: String,
    default: '// Start coding here...'
  },
  language: {
    type: String,
    default: 'javascript'
  },
  participants: [{
    socketId: String,
    username: String
  }],
  active: {
    type: Boolean,
    default: true
  },
  files: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { strictQuery: false });

// Add pre-save hook for error handling
roomSchema.pre('save', function(next) {
  try {
    // Ensure roomId is a string and non-empty
    if (!this.roomId || typeof this.roomId !== 'string' || this.roomId.trim() === '') {
      console.error('Invalid roomId in pre-save hook:', this.roomId);
      throw new Error('Invalid room ID');
    }
    next();
  } catch (error) {
    console.error('Room pre-save error:', error);
    next(error);
  }
});

// Add statics method to safely find or create room
roomSchema.statics.findOrCreateRoom = async function(roomId) {
  try {
    if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
      throw new Error('Invalid room ID');
    }
    
    let room = await this.findOne({ roomId });
    
    if (!room) {
      console.log(`Creating new room ${roomId} via findOrCreateRoom`);
      room = new this({
        roomId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await room.save();
      console.log(`Room ${roomId} created successfully`);
    }
    
    return room;
  } catch (error) {
    console.error(`Error in findOrCreateRoom:`, error);
    throw error;
  }
};

export const Room = mongoose.model('Room', roomSchema); 