import { Router } from 'express';
import { 
  getMessages, 
  sendMessage, 
  getUnreadMessages, 
  markMessageAsRead, 
  markAllMessagesAsRead, 
  getUnreadMessageCount 
} from '../controllers/message.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Route to get all unread messages for the authenticated user
router.get('/unread', verifyToken, getUnreadMessages);

// Route to get the count of unread messages for the authenticated user
router.get('/unread/count', verifyToken, getUnreadMessageCount);

// Route to mark all messages as read
router.post('/mark-all-read', verifyToken, markAllMessagesAsRead);

// Route to mark a specific message as read
router.post('/mark-read/:messageId', verifyToken, markMessageAsRead);

// Route to get messages between the authenticated user and a friend
router.get('/:friendId', verifyToken, getMessages);

// Route to send a message from the authenticated user to a friend
router.post('/:friendId', verifyToken, sendMessage);

export { router }; 