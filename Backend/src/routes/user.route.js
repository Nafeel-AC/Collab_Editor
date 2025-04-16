// route definations for the user
import express from "express";
import { loginConfirmation, registerUser, logoutUser, refreshToken, getAllUsers, addFriend, getFriends, getUserProfile } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { apiLimiter, authLimiter, messageLimiter } from "../middlewares/rateLimiter.middleware.js";
import { APIError } from "../middlewares/error.middleware.js";
import mongoose from "mongoose";

const router = express.Router();

// Public routes with rate limiting
router.post("/login-confirmation", authLimiter, loginConfirmation);
router.post("/register-user", authLimiter, registerUser);
router.get("/", apiLimiter, getAllUsers);
router.post("/logout", apiLimiter, logoutUser);
router.post("/refresh-token", apiLimiter, refreshToken);

// Protected routes (require authentication)
router.post("/add-friend", verifyToken, apiLimiter, addFriend);
router.get("/friends", verifyToken, apiLimiter, getFriends);
router.get("/me", verifyToken, apiLimiter, getUserProfile);

// Get messages between two users with pagination
// router.get('/messages/:userId', verifyToken, apiLimiter, async (req, res, next) => {
//     try {
//         const currentUser = await User.findById(req.user._id).populate('friends');
//         const otherUserId = req.params.userId;
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 50;

//         // Validate user ID
//         if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
//             throw new APIError('Invalid user ID', 400);
//         }

//         // Debug log
//         console.log('Checking friendship between:', {
//             currentUserId: currentUser._id,
//             otherUserId: otherUserId,
//             currentUserFriends: currentUser.friends.map(f => f._id.toString())
//         });

//         // Check if users are friends
//         const areFriends = await User.verifyFriendship(currentUser._id, otherUserId);

//         // Debug log
//         console.log('Friendship status:', areFriends);

//         if (!areFriends) {
//             throw new APIError('You can only view messages with friends', 403);
//         }

//         // Get messages with pagination
//         const messages = await Message.getConversation(
//             currentUser._id,
//             otherUserId,
//             limit,
//             (page - 1) * limit
//         );

//         // Get total count for pagination
//         const totalMessages = await Message.countDocuments({
//             $or: [
//                 { sender: currentUser._id, recipient: otherUserId },
//                 { sender: otherUserId, recipient: currentUser._id }
//             ]
//         });

//         // Mark messages as read in background
//         Message.markAllAsRead(currentUser._id, otherUserId).catch(err => 
//             console.error('Error marking messages as read:', err)
//         );

//         res.json({
//             status: 'success',
//             data: {
//                 messages,
//                 pagination: {
//                     page,
//                     limit,
//                     totalPages: Math.ceil(totalMessages / limit),
//                     totalMessages
//                 }
//             }
//         });
//     } catch (error) {
//         console.error('Error in messages route:', error);
//         next(error);
//     }
// });

// Send a message
// router.post('/messages/:userId', verifyToken, messageLimiter, async (req, res, next) => {
//     try {
//         const currentUser = await User.findById(req.user._id).populate('friends');
//         const recipientId = req.params.userId;
//         const { content } = req.body;

//         // Validate input
//         if (!content?.trim()) {
//             throw new APIError('Message content is required', 400);
//         }

//         if (!mongoose.Types.ObjectId.isValid(recipientId)) {
//             throw new APIError('Invalid recipient ID', 400);
//         }

//         // Debug log
//         console.log('Checking friendship for message send:', {
//             currentUserId: currentUser._id,
//             recipientId: recipientId,
//             currentUserFriends: currentUser.friends.map(f => f._id.toString())
//         });

//         // Check if users are friends
//         const areFriends = await User.verifyFriendship(currentUser._id, recipientId);

//         // Debug log
//         console.log('Friendship status for message send:', areFriends);

//         if (!areFriends) {
//             throw new APIError('You can only send messages to friends', 403);
//         }

//         const message = new Message({
//             sender: currentUser._id,
//             recipient: recipientId,
//             content: content.trim()
//         });

//         await message.save();

//         // Emit socket event for real-time updates
//         req.app.get('io').to(recipientId).emit('new_message', message);

//         res.status(201).json({
//             status: 'success',
//             data: { message }
//         });
//     } catch (error) {
//         console.error('Error in send message route:', error);
//         next(error);
//     }
// });

// Send friend request
// router.post('/friend-request/:userId', verifyToken, apiLimiter, async (req, res, next) => {
//     try {
//         const currentUser = req.user;
//         const targetUserId = req.params.userId;

//         if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
//             throw new APIError('Invalid user ID', 400);
//         }

//         if (currentUser._id.toString() === targetUserId) {
//             throw new APIError('Cannot send friend request to yourself', 400);
//         }

//         const targetUser = await User.findById(targetUserId);
//         if (!targetUser) {
//             throw new APIError('User not found', 404);
//         }

//         // Check if already friends
//         const areFriends = await currentUser.isFriendWith(targetUserId);
//         if (areFriends) {
//             throw new APIError('Already friends with this user', 400);
//         }

//         // Check if request already exists
//         const existingRequest = targetUser.friendRequests.find(
//             req => req.from.toString() === currentUser._id.toString()
//         );
//         if (existingRequest) {
//             throw new APIError('Friend request already sent', 400);
//         }

//         // Add friend request
//         targetUser.friendRequests.push({
//             from: currentUser._id,
//             status: 'pending'
//         });
//         await targetUser.save();

//         // Emit socket event for real-time updates
//         req.app.get('io').to(targetUserId).emit('friend_request', {
//             from: {
//                 _id: currentUser._id,
//                 userName: currentUser.userName
//             }
//         });

//         res.json({
//             status: 'success',
//             message: 'Friend request sent successfully'
//         });
//     } catch (error) {
//         next(error);
//     }
// });

// Handle friend request (accept/reject)
// router.post('/friend-request/:userId/:action', verifyToken, apiLimiter, async (req, res, next) => {
//     try {
//         const currentUser = req.user;
//         const requesterId = req.params.userId;
//         const action = req.params.action;

//         if (!mongoose.Types.ObjectId.isValid(requesterId)) {
//             throw new APIError('Invalid user ID', 400);
//         }

//         if (!['accept', 'reject'].includes(action)) {
//             throw new APIError('Invalid action', 400);
//         }

//         const request = currentUser.friendRequests.find(
//             req => req.from.toString() === requesterId && req.status === 'pending'
//         );

//         if (!request) {
//             throw new APIError('Friend request not found', 404);
//         }

//         const accepted = await currentUser.handleFriendRequest(requesterId, action === 'accept');

//         // Emit socket event for real-time updates
//         const io = req.app.get('io');
//         io.to(requesterId).emit('friend_request_response', {
//             from: currentUser._id,
//             status: action
//         });

//         res.json({
//             status: 'success',
//             message: `Friend request ${action}ed successfully`
//         });
//     } catch (error) {
//         next(error);
//     }
// });

// Get friend requests
// router.get('/friend-requests', verifyToken, apiLimiter, async (req, res, next) => {
//     try {
//         const currentUser = await User.findById(req.user._id)
//             .populate('friendRequests.from', 'userName email')
//             .select('friendRequests');

//         const pendingRequests = currentUser.friendRequests.filter(req => req.status === 'pending');

//         res.json({
//             status: 'success',
//             data: { requests: pendingRequests }
//         });
//     } catch (error) {
//         next(error);
//     }
// });

export { router };