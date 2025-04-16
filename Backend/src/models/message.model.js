import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    recieverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: [5000, 'Message cannot be longer than 5000 characters']
    },
    category: {
        type: String,
        enum: ["text", "image", "video"],
        default: "text",
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        index: true
    },
    readBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

export const Message = mongoose.model('Message', messageSchema); 