import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    recipient: {
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
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
messageSchema.index({ sender: 1, recipient: 1, timestamp: -1 });
messageSchema.index({ recipient: 1, read: 1, timestamp: -1 });

// Method to mark message as read
messageSchema.methods.markAsRead = async function() {
    if (!this.read) {
        this.read = true;
        await this.save();
    }
    return this;
};

// Static method to get conversation between two users with pagination
messageSchema.statics.getConversation = async function(user1Id, user2Id, limit = 50, skip = 0) {
    return this.find({
        $or: [
            { sender: user1Id, recipient: user2Id },
            { sender: user2Id, recipient: user1Id }
        ]
    })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static method to mark all messages as read
messageSchema.statics.markAllAsRead = async function(recipientId, senderId) {
    return this.updateMany(
        {
            recipient: recipientId,
            sender: senderId,
            read: false
        },
        {
            $set: { read: true }
        }
    );
};

// Static method to get unread message count
messageSchema.statics.getUnreadCount = async function(userId) {
    return this.countDocuments({
        recipient: userId,
        read: false
    });
};

// Static method to get unread messages grouped by sender
messageSchema.statics.getUnreadMessagesBySender = async function(userId) {
    return this.aggregate([
        {
            $match: {
                recipient: mongoose.Types.ObjectId(userId),
                read: false
            }
        },
        {
            $group: {
                _id: '$sender',
                count: { $sum: 1 },
                lastMessage: { $last: '$content' },
                lastMessageTime: { $last: '$timestamp' }
            }
        },
        {
            $sort: { lastMessageTime: -1 }
        }
    ]);
};

// Static method to delete all messages in a conversation
messageSchema.statics.deleteConversation = async function(user1Id, user2Id) {
    return this.deleteMany({
        $or: [
            { sender: user1Id, recipient: user2Id },
            { sender: user2Id, recipient: user1Id }
        ]
    });
};

// Pre-save middleware to validate content
messageSchema.pre('save', function(next) {
    // Remove any HTML tags from content for security
    this.content = this.content.replace(/<[^>]*>/g, '');
    next();
});

export const Message = mongoose.model('Message', messageSchema); 