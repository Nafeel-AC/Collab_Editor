import { Router } from "express";
import { createRoom, getRoomById } from "../controllers/room.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Create a new room
router.route("/create").post(verifyToken, createRoom);

// Get room details
router.route("/:roomId").get(verifyToken, getRoomById);

export { router }; 