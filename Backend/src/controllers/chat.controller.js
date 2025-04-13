import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } }).select("userName email");
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const addFriend = async (req, res) => {
    try {
        const { friendId } = req.body;
        const user = await User.findById(req.user._id);
        if (!user.friends.includes(friendId)) {
            user.friends.push(friendId);
            await user.save();
        }
        res.status(200).json({ message: "Friend added successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getChats = async (req, res) => {
    try {
        const chats = await Chat.find({ participants: req.user._id })
            .populate("participants", "userName email")
            .populate("messages.sender", "userName");
        res.status(200).json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { recipientId, text } = req.body;
        let chat = await Chat.findOne({
            participants: { $all: [req.user._id, recipientId] },
        });

        if (!chat) {
            chat = new Chat({ participants: [req.user._id, recipientId], messages: [] });
        }

        chat.messages.push({ sender: req.user._id, text });
        await chat.save();

        res.status(200).json({ message: "Message sent successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
