// controller for handling request from user
import {User} from "../models/user.model.js";
import jwt from "jsonwebtoken";

// Get all users except the current user
async function getAllUsers(req, res) {
    try {
        const users = await User.find()
            .select('userName email _id friends');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Add friend
async function addFriend(req, res) {
    try {
        const { friendId } = req.body;
        const userId = req.user?._id || req.user?.userId; // Handle both formats

        if (!userId || !friendId) {
            return res.status(400).json({ error: "Missing user ID or friend ID" });
        }

        // Check if users exist
        const [user, friend] = await Promise.all([
            User.findById(userId),
            User.findById(friendId)
        ]);

        if (!user || !friend) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if already friends
        if (user.friends && user.friends.includes(friendId)) {
            return res.status(400).json({ error: "Already friends" });
        }

        // Initialize friends array if it doesn't exist
        if (!user.friends) user.friends = [];
        if (!friend.friends) friend.friends = [];

        // Add each other as friends
        user.friends.push(friendId);
        friend.friends.push(userId);

        await Promise.all([user.save(), friend.save()]);

        res.status(200).json({ message: "Friend added successfully" });
    } catch (error) {
        console.error('Error in addFriend:', error);
        res.status(500).json({ error: error.message });
    }
}

// Get friends list
async function getFriends(req, res) {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId).populate('friends', 'userName email _id');
        res.status(200).json(user.friends);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function loginConfirmation(req, res) {
    try {
        // Check if email and password are provided
        if (req.body.email === undefined || req.body.password === undefined) {
            return res.status(400).json({ error: "Please provide all the fields" });
        }

        // Find the user by email
        const requestUser = await User.findOne({ email: req.body.email });

        // Check if the user exists
        if (requestUser == null) {
            return res.status(404).json({ error: "User not found" });
        }
 
        // Check if the password is correct
        if (requestUser.password === req.body.password) {
            // Create access token
            const accessToken = requestUser.createAccessToken();
            const refreshToken = requestUser.createRefreshToken();

            // Send the access token as a cookie
            res.cookie("accesstoken", accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            });
            res.cookie("refreshtoken", refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            });

            return res.status(200).json({
                message: "Login successful",
                userName: requestUser.userName,
                userId: requestUser._id,
                token: accessToken
            });
        } else {
            return res.status(401).json({ error: "Login failed: Password Incorrect" });
        }

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function registerUser (req , res) {
    console.log("register user" , req.body);
    /** If there is something missing userName, email , password or password of less length it will be handled in try block and sent to the client */
    try {
        const newUser = new User({
            userName: req.body.userName, 
            email: req.body.email, 
            password: req.body.password,
            friends: []
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

async function getUserProfile(req, res) {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId)
            .select('userName email _id friends');
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export {
    loginConfirmation,
    registerUser,
    logoutUser,
    refreshToken,
    getAllUsers,
    addFriend,
    getFriends,
    getUserProfile
};