import { Router } from "express";
import { 
  getFiles, 
  createFile, 
  getFileContent,
  updateFile,
  deleteFile,
  renameFile,
  moveFile,
  initializeRoomFiles
} from "../controllers/file.controller.js";

const router = Router();

// Get all files for a room
router.route("/room/:roomId").get(getFiles);

// Initialize room files with default structure
router.route("/initialize/:roomId").post(initializeRoomFiles);

// Create a new file or folder
router.route("/create").post(createFile);

// Get file content by ID
router.route("/:fileId/content").get(getFileContent);

// Update file content or metadata
router.route("/:fileId").put(updateFile);

// Delete a file
router.route("/:fileId").delete(deleteFile);

// Rename a file
router.route("/:fileId/rename").put(renameFile);

// Move a file
router.route("/:fileId/move").put(moveFile);

export { router }; 