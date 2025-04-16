import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema({
    user1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    user2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    status: {
        type: String,
        enum: ["accepted", "pending", "bloced"],
        required: true,
        default: "pending"
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "conversation",
    },
}, { timestamps: true })

friendshipSchema.statics.getFriendsList = async function (user1) {
    try {
        const friendship = await this.find({
            $or: [
                { user1: user1, status: "accepted" },
                { user2: user1, status: "accepted" }
            ]
        });

        const friends = friendship.map((friend) => {
            if (friend.user1 == user1) {
                return friend.user2;
            } else {
                return friend.user1;
            }
        });
        return friends;
    } catch (error) {
        console.log("There was an error in getting friends list", error);
    }
}

friendshipSchema.method.sendFriendRequest = async function (user1, user2) {
    try {
        // const newConversationId = await Conversation.createNewConersation(user1 , user2 );
        await this.insertOne({
            user1: user1,
            user2: user2,
            status: "pending",
        });
    } catch (error) {
        console.log("There was an error in managing friend request", error);
    }
}

friendshipSchema.method.confirmFriend = async function (user1, user2) {
    // create a conversation for the two users
    const newConversationId = await Conversation.createNewConversation(user1, user2);
    try {
        await this.updateOne({
            user1: user1,
            user2: user2,
        }, {
            status: "accepted",
            conversationId: newConversationId,
        });
    } catch (error) {
        console.log("There was an error in confirming friend", error);
    }
}
friendshipSchema.methods.getPendingRequests = async function (userId) {
    try {
        const pendingRequests = await this.find({
            user2: userId,
            status: "pending",
        }).populate("user1", "-password -__v");

        return pendingRequests;
    } catch (error) {
        console.error("Error fetching pending requests:", error);
        // throw error; // Rethrow the error for further handling if needed
    }
};
export const Friendship = mongoose.model("FriendShip", friendshipSchema)