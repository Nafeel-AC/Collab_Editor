import { Router } from "express";
import { 
  chatWithGemini, 
  getConversations, 
  getConversationById, 
  createConversation, 
  updateConversationTitle, 
  deleteConversation,
  addMessageToConversation
} from "../controllers/chat.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Chat with Gemini AI - accessible without authentication
router.post("/", chatWithGemini);

// Protected routes - require authentication
// All conversation management operations require authentication
router.get("/conversations", verifyToken, getConversations);
router.get("/conversations/:id", verifyToken, getConversationById);
router.post("/conversations", verifyToken, createConversation);
router.patch("/conversations/:id/title", verifyToken, updateConversationTitle);
router.put("/conversations/:id/title", verifyToken, updateConversationTitle);
router.delete("/conversations/:id", verifyToken, deleteConversation);
router.post("/conversations/:id/messages", verifyToken, addMessageToConversation);

export { router as chatRouter }; 