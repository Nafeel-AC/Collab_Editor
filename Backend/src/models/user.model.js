// data base model for user
import mongoose from "mongoose"
import jwt from "jsonwebtoken";
import { Friendship } from "./friendship.model.js";

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        trim: true,
        min: 8,
    },
    status: {
        type: String,
        enum: ["online", "offline"],
        default: "offline",
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true
});

/** helper methods of user for creating access and refresh token  */
userSchema.methods.createAccessToken = function () {
    return jwt.sign(
        {
            userId: this._id,
            userName: this.userName,
            email: this.email,
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
        }
    )
};

userSchema.methods.createRefreshToken = function () {
    return jwt.sign(
        {
            userId: this._id
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
        }
    )
};

// Method to get the friends list of a user 
userSchema.methods.getFriendsList = async function (userId) {
    try {
        const friendsList = await Friendship.getFriendsList(userId);
        // return the information of the friends of the user 
        const friendsInfo = await friendsList.map(async (friends) => {
            // we are getting the ids of the friends from the friendship model
            const friend = await this.findById(friends);
            return {
                id: friend._id,
                userName: friend.userName,
                email: friend.email,
                status: friend.status,
                lastSeen: friend.lastSeen,
            };
        })
        // return Promise.all(friendsInfo); // promise all is used to wait for all the promises to be resolved
        return friendsInfo; // return the friends info
    }
    catch (error) {
        console.log("There was an error in getting friends list", error);
    }
}

// Method to check if users are friends
userSchema.methods.isFriendWith = async function (userId) {
    try {
        const friendship = await Friendship.findOne({
            $or: [
                { user1: this._id, user2: userId },
                { user1: userId, user2: this._id },
            ],
        });
        return friendship && friendship.status === "accepted";
    } catch (error) {
        console.error("Error checking friendship:", error);
        return false;
    }
};

// Static method to verify friendship between two users

// Method to handle friend requests
userSchema.methods.handleFriendRequest = async function (fromUserId, accept) {
    try {

    } catch (error) {

    }
};

export const User = mongoose.model("User", userSchema);
