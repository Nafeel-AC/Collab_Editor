// controller for handling request from user
import {User} from "../models/user.model.js";
import jwt from "jsonwebtoken";


async function loginConfirmation(req, res) {
    try {
        console.log("Login attempt:", req.body);
        
        // Check if email and password are provided
        if (req.body.email === undefined || req.body.password === undefined) {
            return res.status(400).json({ error: "Please provide all the fields" });
        }

        // Find the user by email
        const requestUser = await User.findOne({ email: req.body.email });

        // Check if the user exists
        if (requestUser == null) {
            return res.status(404).json({ message: "User not found" });
        }
 
        // Check if the password is correct
        if (requestUser.password === req.body.password) {
            console.log("Login successful for user:", requestUser.userName);

            // Create access token
            const accessToken = requestUser.createAccessToken();
            const refreshToken = requestUser.createRefreshToken();

            // Send the access token as a cookie - removing secure flag for local development
            res.cookie("accesstoken", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Only use secure in production
                sameSite: "lax",
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            res.cookie("refreshtoken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Only use secure in production
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Also return the token in the JSON response for the frontend
            return res.status(200).json({
                message: "Login successful", 
                userName: requestUser.userName,
                token: accessToken // Add token to the response
            });
        } else {
            console.log("Login failed: Password incorrect for user with email:", req.body.email);
            return res.status(401).json({ message: "Login failed: Password Incorrect" });
        }

    } catch (error) {
        // Catch any unexpected errors and send an error response
        console.error("Login error:", error.message);
        return res.status(500).json({ message: error.message });
    }
}


async function registerUser (req , res) {
    console.log("register user" , req.body);
    /** If there is something missing userName, email , password or password of less length it will be handled in try block and sent to the client */
    try {
        const newUser = new User({
            userName: req.body.userName, 
            email: req.body.email, 
            password: req.body.password
        })
        await newUser.save();
        return res.status(200).json({message: "User registered successfully"})
    } catch(error) {
        console.log(error)
        res.status(400).json({error: error.message});
    }
}

const logoutUser = async (req , res ) => {
    res.clearCookie("accesstoken");
    res.clearCookie("refreshtoken");
    return res.status(200).json({message: "User logged out successfully"});

}

const refreshToken = async (req , res ) => {
    const refreshToken = req.cookies?.refreshtoken || req.body.refreshtoken;
    if (!refreshToken) {
        return res.status(403).json({error: "No refresh Token"});
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_ACCESS_SECRET, {
            expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
        });

        res.cookie("accesstoken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        return res.status(200).json({ message: "Access token refreshed" });
    } catch (error) {
        return res.status(401).json({ error: "Invalid refresh token" });
    }
}
// Get all users except the current user and their friends
const getAllUsers = async (req, res) => {
    try {
        const userId = req.userId; // Assuming userId is available from auth middleware
        
        // Find the current user to get their friends list
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Get all users except the current user, their friends, and users they've sent requests to
        const users = await User.find({
            _id: { 
                $ne: userId, 
                $nin: [...currentUser.friends, ...currentUser.sentFriendRequests, ...currentUser.friendRequests] 
            }
        }).select('_id userName email');
        
        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Send a friend request
const sendFriendRequest = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const userId = req.userId; // From auth middleware
        
        if (!targetUserId) {
            return res.status(400).json({ error: "Target user ID is required" });
        }
        
        // Check if users exist
        const [sender, receiver] = await Promise.all([
            User.findById(userId),
            User.findById(targetUserId)
        ]);
        
        if (!sender || !receiver) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Check if already friends
        if (sender.friends.includes(targetUserId)) {
            return res.status(400).json({ error: "Already friends with this user" });
        }
        
        // Check if request already sent
        if (sender.sentFriendRequests.includes(targetUserId)) {
            return res.status(400).json({ error: "Friend request already sent" });
        }
        
        // Update both users
        sender.sentFriendRequests.push(targetUserId);
        receiver.friendRequests.push(userId);
        
        await Promise.all([sender.save(), receiver.save()]);
        
        return res.status(200).json({ message: "Friend request sent successfully" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Accept a friend request
const acceptFriendRequest = async (req, res) => {
    try {
        const { requesterId } = req.body;
        const userId = req.userId; // From auth middleware
        
        if (!requesterId) {
            return res.status(400).json({ error: "Requester ID is required" });
        }
        
        // Check if users exist
        const [currentUser, requester] = await Promise.all([
            User.findById(userId),
            User.findById(requesterId)
        ]);
        
        if (!currentUser || !requester) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Check if request exists
        if (!currentUser.friendRequests.includes(requesterId)) {
            return res.status(400).json({ error: "No friend request from this user" });
        }
        
        // Update both users' friends lists
        currentUser.friends.push(requesterId);
        requester.friends.push(userId);
        
        // Remove from requests lists
        currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId.toString());
        requester.sentFriendRequests = requester.sentFriendRequests.filter(id => id.toString() !== userId.toString());
        
        await Promise.all([currentUser.save(), requester.save()]);
        
        return res.status(200).json({ message: "Friend request accepted" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Reject a friend request
const rejectFriendRequest = async (req, res) => {
    try {
        const { requesterId } = req.body;
        const userId = req.userId; // From auth middleware
        
        if (!requesterId) {
            return res.status(400).json({ error: "Requester ID is required" });
        }
        
        // Check if users exist
        const [currentUser, requester] = await Promise.all([
            User.findById(userId),
            User.findById(requesterId)
        ]);
        
        if (!currentUser || !requester) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Remove from requests lists
        currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId.toString());
        requester.sentFriendRequests = requester.sentFriendRequests.filter(id => id.toString() !== userId.toString());
        
        await Promise.all([currentUser.save(), requester.save()]);
        
        return res.status(200).json({ message: "Friend request rejected" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Get friend requests
const getFriendRequests = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware
        
        // Find user with populated friend requests
        const user = await User.findById(userId).populate('friendRequests', '_id userName email');
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        return res.status(200).json(user.friendRequests);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Get friends
const getFriends = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware
        
        // Find user with populated friends
        const user = await User.findById(userId).populate('friends', '_id userName email');
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        return res.status(200).json(user.friends);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export {
    loginConfirmation, 
    registerUser, 
    logoutUser, 
    refreshToken,
    getAllUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriendRequests,
    getFriends
};