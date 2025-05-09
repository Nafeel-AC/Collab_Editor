import { Router } from "express";
import { 
  saveProject,
  getUserProjects,
  getProjectById,
  loadProjectToRoom,
  deleteProject
} from '../controllers/project.controller.js';
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Save a project from a room
router.route("/save/:roomId").post(verifyToken, saveProject);

// Get all projects for the current user
router.route("/").get(verifyToken, getUserProjects);

// Get a specific project by ID
router.route("/:projectId").get(verifyToken, getProjectById);

// Load a project into a new room
router.route("/load/:projectId").post(verifyToken, loadProjectToRoom);

// Delete a project
router.route("/:projectId").delete(verifyToken, deleteProject);

export default router; 