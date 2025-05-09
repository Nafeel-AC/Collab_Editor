import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    roomId: {
      type: String,
      required: true,
      index: true
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    participants: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      username: String,
      joinedAt: Date,
      leftAt: Date
    }],
    files: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    },
    rootFolder: {
      type: String,
      default: "/"
    },
    isActive: {
      type: Boolean,
      default: false
    },
    thumbnail: {
      type: String,
      default: ""
    },
    language: {
      type: String,
      default: 'javascript'
    },
    tags: [{
      type: String
    }]
  },
  {
    timestamps: true
  }
);

// Create an index on host and project name for efficient lookups
projectSchema.index({ hostId: 1, name: 1 });

export const Project = mongoose.model("Project", projectSchema); 