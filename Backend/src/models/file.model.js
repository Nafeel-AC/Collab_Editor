import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      default: ""
    },
    type: {
      type: String,
      enum: ["file", "folder"],
      default: "file"
    },
    path: {
      type: String,
      required: true
    },
    language: {
      type: String,
      default: "javascript"
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: String,
      default: "Anonymous"
    }
  },
  {
    timestamps: true
  }
);

// Compound index for path and roomId for efficient lookup
fileSchema.index({ roomId: 1, path: 1 }, { unique: true });

export const File = mongoose.model("File", fileSchema); 