import { Router } from 'express';
import { getMessages, sendMessage } from '../controllers/message.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Route to get messages between the authenticated user and a friend
router.get('/:friendId', verifyToken, getMessages);

// Route to send a message from the authenticated user to a friend
router.post('/:friendId', verifyToken, sendMessage);

export { router }; 