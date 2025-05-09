import { Router } from "express";
import { 
    createRoom, 
    getRoomById, 
    joinRoom, 
    getActiveRooms,
    cleanupInactiveRooms,
    closeRoom
} from '../controllers/room.controller.js';
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Create a new room
router.route("/create").post(verifyToken, createRoom);

// Join a room
router.route("/join").post(verifyToken, joinRoom);

// Get active rooms (admin-only)
router.route("/active").get(verifyToken, isAdmin, getActiveRooms);

// Cleanup inactive rooms (admin-only)
router.route("/cleanup").post(verifyToken, isAdmin, cleanupInactiveRooms);

// Close a room (host or admin)
router.route("/:roomId/close").post(verifyToken, closeRoom);

// Get room details
router.route("/:roomId").get(verifyToken, getRoomById);

export default router; 