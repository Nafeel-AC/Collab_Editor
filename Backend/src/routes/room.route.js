import { Router } from "express";
import { 
    createRoom, 
    getRoomById, 
    joinRoom, 
    getActiveRooms 
} from '../controllers/room.controller.js';
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Create a new room
router.route("/create").post(verifyToken, createRoom);

// Get room details
router.route("/:roomId").get(verifyToken, getRoomById);

// Join a room
router.route("/join").post(verifyToken, joinRoom);

// Get active rooms (admin-only)
router.route("/active").get(verifyToken, isAdmin, getActiveRooms);

export default router; 