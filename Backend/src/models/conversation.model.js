import mongoose from "mongoose";

const conversationSchema = mongoose.Schema({
    participants: {
        type: [mongoose.Schema.Types.ObjectId, mongoose.Schema.Types.ObjectId],
        enum: ["private", "group"],
    },
    category: {
        type: String,
        enum: ["private", "group"]
    },
    lastMessage: {
        messageId: mongoose.Schema.Types.ObjectId,
        ref: "message",
        content: String,
        timestamp: {
            type: Date,
            default: Date.now,
        }
    }
}, { timestamps: true });

conversationSchema.method.createNewConversation = async function (user1, user2) {
    try {
        const newConversation = await this.create({
            participants: [user1, user2],
            category: "private",
        })
        return newConversation._id;
    } catch (error) {
        console.log("There was an error in creating new conversation", error);
    }
}
export const Conversation = mongoose.model("Conversation", conersationSchema);