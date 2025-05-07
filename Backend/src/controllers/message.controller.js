import { User } from '../models/user.model.js';
import { Message } from '../models/message.model.js';

// Get messages between the authenticated user and a friend
export const getMessages = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.userId;

    // Find messages between the two users
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Send a message from the authenticated user to a friend
export const sendMessage = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.userId;
    const { message } = req.body;

    // Create a new message
    const newMessage = new Message({
      sender: userId,
      receiver: friendId,
      text: message
    });

    await newMessage.save();

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get all unread messages for the authenticated user
export const getUnreadMessages = async (req, res) => {
  try {
    const userId = req.userId;

    // Find all unread messages where the user is the receiver
    const unreadMessages = await Message.find({
      receiver: userId,
      read: false
    }).sort({ createdAt: -1 }); // Sort by newest first

    // Get sender details for each message
    const populatedMessages = await Promise.all(
      unreadMessages.map(async (message) => {
        const sender = await User.findById(message.sender);
        return {
          ...message.toObject(),
          senderName: sender ? sender.userName : 'Unknown User',
          senderProfilePic: sender?.profilePic || null
        };
      })
    );

    res.status(200).json(populatedMessages);
  } catch (error) {
    console.error('Error fetching unread messages:', error);
    res.status(500).json({ error: 'Failed to fetch unread messages' });
  }
};

// Mark a specific message as read
export const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    // Find the message and verify the receiver is the current user
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Ensure the user is the receiver of the message
    if (message.receiver.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to mark this message as read' });
    }

    // Update the message
    message.read = true;
    await message.save();

    res.status(200).json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
};

// Mark all messages as read
export const markAllMessagesAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    // Update all unread messages where the user is the receiver
    await Message.updateMany(
      { receiver: userId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: 'All messages marked as read' });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    res.status(500).json({ error: 'Failed to mark all messages as read' });
  }
};

// Get the count of unread messages for the authenticated user
export const getUnreadMessageCount = async (req, res) => {
  try {
    const userId = req.userId;

    // Count unread messages
    const count = await Message.countDocuments({
      receiver: userId,
      read: false
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error('Error getting unread message count:', error);
    res.status(500).json({ error: 'Failed to get unread message count' });
  }
}; 