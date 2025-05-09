import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  language: {
    type: String,
    default: 'javascript',
  },
  document: {
    type: String,
    default: '// Start coding here...',
  },
  createdBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  participants: [{
    socketId: String,
    username: String,
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  closedAt: {
    type: Date,
    default: null,
  },
  // Fields to track the original project
  originalProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  projectName: {
    type: String,
    default: null
  },
  isProjectRoom: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Clear any existing indexes that might be causing issues
// This will run when the application starts
const clearProblemIndex = async () => {
  try {
    const Room = mongoose.model("Room");
    await Room.collection.dropIndex("roomKey_1").catch(() => {
      console.log("No roomKey_1 index to drop or already dropped");
    });
    console.log("Checked and handled potential problematic index");
  } catch (error) {
    console.error("Error with index management:", error);
  }
};

// Ensure roomId is used as the only unique identifier
roomSchema.index({ roomId: 1 }, { unique: true });

export const Room = mongoose.model("Room", roomSchema);

// Execute the function to fix the index issue
setTimeout(() => {
  clearProblemIndex();
}, 2000); // Wait for connection to be established 