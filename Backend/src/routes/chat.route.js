import { Router } from "express";
import { getChats, sendMessage } from "../controllers/chat.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, getChats); // Get chats for the logged-in user
router.post("/send", verifyToken, sendMessage); // Send a message

export { router };
