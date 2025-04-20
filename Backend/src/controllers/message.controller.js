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