import { Project } from "../models/project.model.js";
import { File } from "../models/file.model.js";
import { Room } from "../models/room.model.js";
import mongoose from "mongoose";

// Save a project when closing a room
export const saveProject = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description, tags, createdBy, fileIds } = req.body;
    const userId = req.userId; // From authentication middleware
    
    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }
    
    if (!name) {
      return res.status(400).json({ message: "Project name is required" });
    }
    
    // Check if the room exists
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    
    console.log(`Saving project for room: ${roomId}`);
    console.log(`Room creator: "${room.createdBy}", Request username: "${req.userName}"`);
    
    if (createdBy) {
      console.log(`Explicit createdBy provided: "${createdBy}"`);
    }
    
    // Verify the user is the room creator - using case-insensitive comparison or explicit createdBy
    const usernameMatches = 
      room.createdBy === req.userName || 
      room.createdBy.toLowerCase() === req.userName.toLowerCase() ||
      (createdBy && (room.createdBy === createdBy || room.createdBy.toLowerCase() === createdBy.toLowerCase()));
    
    if (!usernameMatches) {
      console.log(`Username mismatch: roomCreator="${room.createdBy}", requestUser="${req.userName}", providedCreator="${createdBy || 'none'}"`);
      return res.status(403).json({ message: "Only the room creator can save the project" });
    }
    
    // Get files for the room - either use provided fileIds or fetch all files
    let files;
    if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
      console.log(`Using ${fileIds.length} explicitly provided file IDs`);
      files = await File.find({ 
        _id: { $in: fileIds },
        isDeleted: false 
      });
      
      console.log(`Found ${files.length} files from provided IDs`);
    } else {
      console.log('No file IDs provided, fetching all files for room');
      files = await File.find({ roomId, isDeleted: false });
    }
    
    if (files.length === 0) {
      return res.status(404).json({ message: "No files found for this room" });
    }
    
    let project;
    let isNewProject = true;
    
    // Check if this room was loaded from an existing project
    if (room.originalProjectId) {
      // Try to find the original project
      const existingProject = await Project.findById(room.originalProjectId);
      
      if (existingProject && existingProject.hostId.toString() === userId) {
        console.log(`Updating existing project: ${existingProject._id} (${existingProject.name})`);
        isNewProject = false;
        
        // Update the existing project
        existingProject.name = name;
        existingProject.description = description || existingProject.description;
        existingProject.files = files.map(file => file._id);
        existingProject.language = room.language;
        if (tags) existingProject.tags = tags;
        existingProject.lastAccessed = new Date();
        
        // Save the updated project
        project = await existingProject.save();
        console.log(`Project updated successfully: ${project._id}`);
      } else {
        console.log(`Original project not found or user doesn't have access. Creating new project.`);
      }
    }
    
    // If we're not updating an existing project, check for name duplication and create a new one
    if (isNewProject) {
      // Check if a project with this name already exists for this user
      const existingProject = await Project.findOne({ 
        hostId: userId,
        name: name 
      });
      
      if (existingProject) {
        return res.status(409).json({ message: "A project with this name already exists" });
      }
      
      // Create a new project
      console.log(`Creating new project: ${name}`);
      project = new Project({
        name,
        description: description || `Project created from room ${roomId}`,
        roomId,
        hostId: userId,
        files: files.map(file => file._id),
        language: room.language,
        tags: tags || []
      });
      
      // Save the new project
      await project.save();
      console.log(`New project created: ${project._id}`);
    }
    
    // Close the room
    room.isActive = false;
    room.closedAt = new Date();
    await room.save();
    
    return res.status(201).json({ 
      message: isNewProject ? "Project saved successfully" : "Project updated successfully", 
      projectId: project._id,
      project,
      isNewProject
    });
  } catch (error) {
    console.error("Error saving project:", error);
    return res.status(500).json({ message: "Failed to save project", error: error.message });
  }
};

// Get projects for the current user
export const getUserProjects = async (req, res) => {
  try {
    const userId = req.userId; // From authentication middleware
    
    const projects = await Project.find({ hostId: userId })
      .sort({ updatedAt: -1 })
      .select('-files'); // Exclude file IDs to keep the response small
    
    return res.status(200).json({ projects });
  } catch (error) {
    console.error("Error getting user projects:", error);
    return res.status(500).json({ message: "Failed to get projects", error: error.message });
  }
};

// Get a specific project
export const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId; // From authentication middleware
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Verify the user is the project owner
    if (project.hostId.toString() !== userId) {
      return res.status(403).json({ message: "You don't have permission to access this project" });
    }
    
    // Get all files for the project
    const files = await File.find({ 
      _id: { $in: project.files },
      isDeleted: false 
    });
    
    // Update lastAccessed time
    project.lastAccessed = new Date();
    await project.save();
    
    return res.status(200).json({ 
      project,
      files
    });
  } catch (error) {
    console.error("Error getting project:", error);
    return res.status(500).json({ message: "Failed to get project", error: error.message });
  }
};

// Load a project into a new room
export const loadProjectToRoom = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId; // From authentication middleware
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Verify the user is the project owner
    if (project.hostId.toString() !== userId) {
      return res.status(403).json({ message: "You don't have permission to load this project" });
    }
    
    console.log(`Loading project ${project._id} (${project.name}) with ${project.files?.length || 0} files`);
    
    // Get all files for the project
    const projectFiles = await File.find({ 
      _id: { $in: project.files },
      isDeleted: false 
    });
    
    console.log(`Found ${projectFiles.length} files for project ${projectId}`);
    
    if (projectFiles.length === 0) {
      return res.status(404).json({ message: "No files found for this project" });
    }
    
    // Generate a new room ID
    const roomId = Math.random().toString(36).substring(2, 9);
    
    console.log(`Created new room ${roomId} for project ${projectId}`);
    
    // Create a new room with metadata about the original project
    const newRoom = new Room({
      roomId,
      createdBy: req.userName,
      language: project.language || 'javascript',
      document: '// Project loaded from saved project',
      isActive: true,
      // Store the original project ID to maintain the connection
      originalProjectId: projectId,
      projectName: project.name
    });
    
    await newRoom.save();
    
    console.log(`Creating ${projectFiles.length} files in the new room`);
    
    // Create new files for the room based on project files
    const newFiles = await Promise.all(projectFiles.map(async (file) => {
      console.log(`Creating file ${file.name} (${file.path}) in room ${roomId}`);
      
      const newFile = new File({
        roomId,
        name: file.name,
        type: file.type,
        path: file.path,
        content: file.content,
        language: file.language,
        parentId: null, // We'll update this after creating all files
        createdBy: req.userName
      });
      
      await newFile.save();
      return { oldId: file._id.toString(), newFile };
    }));
    
    console.log(`Created ${newFiles.length} files in room ${roomId}`);
    
    // Create a map of old to new file IDs for updating parentIds
    const fileIdMap = newFiles.reduce((map, { oldId, newFile }) => {
      map[oldId] = newFile._id;
      return map;
    }, {});
    
    // Update parentIds based on the original structure
    await Promise.all(newFiles.map(async ({ oldId, newFile }) => {
      const originalFile = projectFiles.find(f => f._id.toString() === oldId);
      
      if (originalFile.parentId) {
        const newParentId = fileIdMap[originalFile.parentId.toString()];
        
        if (newParentId) {
          newFile.parentId = newParentId;
          await newFile.save();
        }
      }
    }));
    
    // Update project's lastAccessed time
    project.lastAccessed = new Date();
    await project.save();
    
    return res.status(200).json({ 
      message: "Project loaded successfully",
      roomId,
      projectId, // Return the original project ID
      files: newFiles.map(({ newFile }) => newFile)
    });
  } catch (error) {
    console.error("Error loading project to room:", error);
    return res.status(500).json({ message: "Failed to load project", error: error.message });
  }
};

// Delete a project
export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId; // From authentication middleware
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Verify the user is the project owner
    if (project.hostId.toString() !== userId) {
      return res.status(403).json({ message: "You don't have permission to delete this project" });
    }
    
    // Delete the project
    await Project.findByIdAndDelete(projectId);
    
    return res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return res.status(500).json({ message: "Failed to delete project", error: error.message });
  }
};

export default {
  saveProject,
  getUserProjects,
  getProjectById,
  loadProjectToRoom,
  deleteProject
}; 