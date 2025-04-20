import { File } from "../models/file.model.js";
import mongoose from "mongoose";

// Get all files for a room
export const getFiles = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    const files = await File.find({ 
      roomId, 
      isDeleted: false 
    }).sort({ type: 1, name: 1 });
    
    return res.status(200).json({ files });
  } catch (error) {
    console.error("Error getting files:", error);
    return res.status(500).json({ message: "Failed to get files", error: error.message });
  }
};

// Create a new file or folder
export const createFile = async (req, res) => {
  try {
    const { roomId, name, type, path, content, language, parentId, createdBy } = req.body;
    
    if (!roomId || !name || !path) {
      return res.status(400).json({ message: "Room ID, name, and path are required" });
    }

    // Check if file/folder already exists at this path
    const existingFile = await File.findOne({ roomId, path });
    
    if (existingFile) {
      return res.status(400).json({ message: "A file or folder already exists at this path" });
    }

    const file = await File.create({
      roomId,
      name,
      type: type || "file",
      path,
      content: content || "",
      language: language || "javascript",
      parentId: parentId || null,
      createdBy: createdBy || "Anonymous"
    });

    return res.status(201).json({ file });
  } catch (error) {
    console.error("Error creating file:", error);
    return res.status(500).json({ message: "Failed to create file", error: error.message });
  }
};

// Get file content
export const getFileContent = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ message: "File ID is required" });
    }

    const file = await File.findById(fileId);
    
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (file.type === "folder") {
      return res.status(400).json({ message: "Cannot get content of a folder" });
    }

    return res.status(200).json({ 
      content: file.content,
      language: file.language,
      name: file.name
    });
  } catch (error) {
    console.error("Error getting file content:", error);
    return res.status(500).json({ message: "Failed to get file content", error: error.message });
  }
};

// Update file content and language
export const updateFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { content, language, name } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ message: "File ID is required" });
    }

    const file = await File.findById(fileId);
    
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (file.type === "folder" && content !== undefined) {
      return res.status(400).json({ message: "Cannot update content of a folder" });
    }

    // Update only the provided fields
    if (content !== undefined) file.content = content;
    if (language !== undefined) file.language = language;
    if (name !== undefined) file.name = name;

    await file.save();

    return res.status(200).json({ file });
  } catch (error) {
    console.error("Error updating file:", error);
    return res.status(500).json({ message: "Failed to update file", error: error.message });
  }
};

// Delete a file or folder
export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ message: "File ID is required" });
    }

    const file = await File.findById(fileId);
    
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // If it's a folder, also mark all files inside as deleted
    if (file.type === "folder") {
      const folderPath = file.path;
      await File.updateMany(
        { path: { $regex: `^${folderPath}/` }, roomId: file.roomId },
        { isDeleted: true }
      );
    }

    // Soft delete
    file.isDeleted = true;
    await file.save();

    return res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return res.status(500).json({ message: "Failed to delete file", error: error.message });
  }
};

// Rename a file or folder
export const renameFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { newName } = req.body;
    
    if (!fileId || !newName) {
      return res.status(400).json({ message: "File ID and new name are required" });
    }

    const file = await File.findById(fileId);
    
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Get the directory part of the path
    const pathParts = file.path.split('/');
    pathParts.pop(); // Remove the last part (current filename)
    const dirPath = pathParts.join('/');
    
    // Construct new path
    const newPath = dirPath ? `${dirPath}/${newName}` : newName;
    
    // Check if a file already exists at the new path
    const existingFile = await File.findOne({ 
      roomId: file.roomId, 
      path: newPath,
      _id: { $ne: file._id }, // Exclude the current file
      isDeleted: false
    });
    
    if (existingFile) {
      return res.status(400).json({ message: "A file or folder with this name already exists in this location" });
    }

    // For folders, update all contained files' paths too
    if (file.type === "folder") {
      const oldPath = file.path;
      const filesInFolder = await File.find({
        roomId: file.roomId,
        path: { $regex: `^${oldPath}/` },
        isDeleted: false
      });
      
      // Update each file's path
      for (const childFile of filesInFolder) {
        childFile.path = childFile.path.replace(oldPath, newPath);
        await childFile.save();
      }
    }

    // Update the file
    file.name = newName;
    file.path = newPath;
    await file.save();

    return res.status(200).json({ file });
  } catch (error) {
    console.error("Error renaming file:", error);
    return res.status(500).json({ message: "Failed to rename file", error: error.message });
  }
};

// Move a file or folder to a new location
export const moveFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { newParentId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ message: "File ID is required" });
    }

    const file = await File.findById(fileId);
    
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Root folder case
    if (!newParentId) {
      // Move to root
      const newPath = file.name;
      
      // Check for naming conflict in root
      const existingFile = await File.findOne({
        roomId: file.roomId,
        path: newPath,
        _id: { $ne: file._id },
        isDeleted: false
      });
      
      if (existingFile) {
        return res.status(400).json({ message: "A file or folder with this name already exists in the root folder" });
      }

      // Update paths for nested files if it's a folder
      if (file.type === "folder") {
        const oldPath = file.path;
        const filesInFolder = await File.find({
          roomId: file.roomId,
          path: { $regex: `^${oldPath}/` },
          isDeleted: false
        });
        
        for (const childFile of filesInFolder) {
          childFile.path = childFile.path.replace(oldPath, newPath);
          await childFile.save();
        }
      }

      file.path = newPath;
      file.parentId = null;
      await file.save();
      
      return res.status(200).json({ file });
    }

    // Moving to another folder
    const parentFolder = await File.findById(newParentId);
    
    if (!parentFolder) {
      return res.status(404).json({ message: "Parent folder not found" });
    }

    if (parentFolder.type !== "folder") {
      return res.status(400).json({ message: "Target is not a folder" });
    }

    const newPath = `${parentFolder.path}/${file.name}`;
    
    // Check for naming conflict in target folder
    const existingFile = await File.findOne({
      roomId: file.roomId,
      path: newPath,
      _id: { $ne: file._id },
      isDeleted: false
    });
    
    if (existingFile) {
      return res.status(400).json({ message: "A file or folder with this name already exists in the target folder" });
    }

    // Update paths for nested files if it's a folder
    if (file.type === "folder") {
      const oldPath = file.path;
      const filesInFolder = await File.find({
        roomId: file.roomId,
        path: { $regex: `^${oldPath}/` },
        isDeleted: false
      });
      
      for (const childFile of filesInFolder) {
        childFile.path = childFile.path.replace(oldPath, newPath);
        await childFile.save();
      }
    }

    file.path = newPath;
    file.parentId = parentFolder._id;
    await file.save();

    return res.status(200).json({ file });
  } catch (error) {
    console.error("Error moving file:", error);
    return res.status(500).json({ message: "Failed to move file", error: error.message });
  }
};

// Create initial file structure for a room
export const initializeRoomFiles = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { username } = req.body;
    
    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    // Check if files already exist for this room
    const existingFiles = await File.find({ roomId, isDeleted: false });
    
    if (existingFiles.length > 0) {
      return res.status(200).json({ message: "Room files already initialized", files: existingFiles });
    }

    // Create default file structure
    const files = [
      {
        roomId,
        name: "main.js",
        type: "file",
        path: "main.js",
        content: "// Welcome to your collaborative code editor!\n// Start coding here...",
        language: "javascript",
        createdBy: username || "Anonymous"
      },
      {
        roomId,
        name: "README.md",
        type: "file",
        path: "README.md",
        content: "# Project Documentation\n\nWelcome to your collaborative project! Use this file to document your work.",
        language: "markdown",
        createdBy: username || "Anonymous"
      }
    ];

    const createdFiles = await File.insertMany(files);

    return res.status(201).json({ message: "Room files initialized", files: createdFiles });
  } catch (error) {
    console.error("Error initializing room files:", error);
    return res.status(500).json({ message: "Failed to initialize room files", error: error.message });
  }
};

export default {
  getFiles,
  createFile,
  getFileContent,
  updateFile,
  deleteFile,
  renameFile,
  moveFile,
  initializeRoomFiles
}; 