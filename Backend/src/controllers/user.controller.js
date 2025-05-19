// controller for handling request from user
import {User} from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { uploadToCloudinary } from '../config/cloudinary.config.js';


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
        });
        
        await newUser.save();
        
        // Create access token
        const accessToken = newUser.createAccessToken();
        const refreshToken = newUser.createRefreshToken();

        // Send the access token as a cookie
        res.cookie("accesstoken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        res.cookie("refreshtoken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        // Return the token in the response
        return res.status(200).json({
            message: "User registered successfully",
            userName: newUser.userName,
            userId: newUser._id,
            token: accessToken
        });
    } catch(error) {
        console.log(error);
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
        
        console.log(`[DEBUG] Attempting to send friend request from ${userId} to ${targetUserId}`);
        
        if (!targetUserId) {
            console.log("[DEBUG] Error: Target user ID is missing");
            return res.status(400).json({ error: "Target user ID is required" });
        }
        
        if (userId === targetUserId) {
            console.log("[DEBUG] Error: Cannot send friend request to yourself");
            return res.status(400).json({ error: "Cannot send friend request to yourself" });
        }
        
        // Check if users exist
        console.log("[DEBUG] Fetching user data for sender and receiver");
        const [sender, receiver] = await Promise.all([
            User.findById(userId),
            User.findById(targetUserId)
        ]);
        
        console.log("[DEBUG] Sender:", sender ? sender._id.toString() : "Not found");
        console.log("[DEBUG] Receiver:", receiver ? receiver._id.toString() : "Not found");
        
        if (!sender) {
            console.log(`[DEBUG] Error: Sender user with ID ${userId} not found`);
            return res.status(404).json({ error: "Sender user not found" });
        }
        
        if (!receiver) {
            console.log(`[DEBUG] Error: Target user with ID ${targetUserId} not found`);
            return res.status(404).json({ error: "Target user not found" });
        }
        
        console.log(`[DEBUG] Sender: ${sender.userName}, Receiver: ${receiver.userName}`);
        
        // Check if already friends
        const isFriend = sender.friends.some(friendId => friendId.toString() === targetUserId);
        console.log(`[DEBUG] Already friends? ${isFriend}`);
        
        if (isFriend) {
            console.log("[DEBUG] Users are already friends");
            return res.status(400).json({ error: "Already friends with this user" });
        }
        
        // Check if request already sent
        const requestAlreadySent = sender.sentFriendRequests.some(requestId => requestId.toString() === targetUserId);
        console.log(`[DEBUG] Request already sent? ${requestAlreadySent}`);
        
        if (requestAlreadySent) {
            console.log("[DEBUG] Friend request already sent");
            return res.status(400).json({ error: "Friend request already sent" });
        }
        
        // Check if there's a pending request from the target user
        const pendingRequest = sender.friendRequests.some(requestId => requestId.toString() === targetUserId);
        console.log(`[DEBUG] Pending request from target? ${pendingRequest}`);
        
        if (pendingRequest) {
            console.log("[DEBUG] There's already a friend request from this user. Consider accepting it instead.");
            return res.status(400).json({ 
                error: "This user has already sent you a friend request. Check your friend requests tab." 
            });
        }
        
        console.log("[DEBUG] Using findOneAndUpdate for atomic updates");
        // Use findOneAndUpdate for atomic updates to avoid version conflicts
        const [updateSender, updateReceiver] = await Promise.all([
            // Update the sender (add to sent friend requests)
            User.findByIdAndUpdate(
                userId,
                {
                    $addToSet: { sentFriendRequests: targetUserId } // Add to sent requests
                },
                { new: true } // Return updated document
            ),
            
            // Update the receiver (add to friend requests)
            User.findByIdAndUpdate(
                targetUserId,
                {
                    $addToSet: { friendRequests: userId } // Add to friend requests
                },
                { new: true } // Return updated document
            )
        ]);
        
        console.log("[DEBUG] Update results:");
        console.log("[DEBUG] Sender updated:", updateSender ? "Yes" : "No");
        console.log("[DEBUG] Receiver updated:", updateReceiver ? "Yes" : "No");
        
        if (!updateSender || !updateReceiver) {
            console.log("[DEBUG] Failed to update user records");
            return res.status(500).json({ error: "Failed to update user records" });
        }
        
        console.log("[DEBUG] Updated sender's sentFriendRequests:", updateSender.sentFriendRequests.map(id => id.toString()));
        console.log("[DEBUG] Updated receiver's friendRequests:", updateReceiver.friendRequests.map(id => id.toString()));
        
        console.log("[DEBUG] Friend request sent successfully");
        
        return res.status(200).json({ 
            message: "Friend request sent successfully",
            senderName: sender.userName,
            receiverName: receiver.userName 
        });
    } catch (error) {
        console.error("[DEBUG] Error sending friend request:", error);
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
        
        // Use findOneAndUpdate for atomic updates to avoid version conflicts
        const [updateCurrentUser, updateRequester] = await Promise.all([
            // Update the current user (add friend, remove friend request)
            User.findByIdAndUpdate(
                userId,
                {
                    $addToSet: { friends: requesterId }, // Add requester to friends (addToSet prevents duplicates)
                    $pull: { friendRequests: requesterId } // Remove from friend requests
                },
                { new: true } // Return updated document
            ),
            
            // Update the requester (add friend, remove sent request)
            User.findByIdAndUpdate(
                requesterId,
                {
                    $addToSet: { friends: userId }, // Add current user to friends
                    $pull: { sentFriendRequests: userId } // Remove from sent requests
                },
                { new: true } // Return updated document
            )
        ]);
        
        if (!updateCurrentUser || !updateRequester) {
            return res.status(500).json({ error: "Failed to update user records" });
        }
        
        return res.status(200).json({ 
            message: "Friend request accepted",
            currentUser: { 
                id: updateCurrentUser._id,
                friends: updateCurrentUser.friends
            },
            requester: {
                id: updateRequester._id,
                name: updateRequester.userName
            }
        });
    } catch (error) {
        console.error("Error accepting friend request:", error);
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
        
        // Use findOneAndUpdate for atomic updates to avoid version conflicts
        const [updateCurrentUser, updateRequester] = await Promise.all([
            // Update the current user (remove friend request)
            User.findByIdAndUpdate(
                userId,
                {
                    $pull: { friendRequests: requesterId } // Remove from friend requests
                },
                { new: true } // Return updated document
            ),
            
            // Update the requester (remove sent request)
            User.findByIdAndUpdate(
                requesterId,
                {
                    $pull: { sentFriendRequests: userId } // Remove from sent requests
                },
                { new: true } // Return updated document
            )
        ]);
        
        if (!updateCurrentUser || !updateRequester) {
            return res.status(500).json({ error: "Failed to update user records" });
        }
        
        return res.status(200).json({ message: "Friend request rejected" });
    } catch (error) {
        console.error("Error rejecting friend request:", error);
        return res.status(500).json({ error: error.message });
    }
};

// Get friend requests
const getFriendRequests = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware
        console.log(`[DEBUG] Fetching friend requests for user: ${userId}`);
        
        // Find user with detailed data
        const user = await User.findById(userId);
        
        if (!user) {
            console.log(`[DEBUG] User with ID ${userId} not found when fetching friend requests`);
            return res.status(404).json({ error: "User not found" });
        }
        
        console.log(`[DEBUG] User ${user.userName} (${user._id}) found`);
        console.log(`[DEBUG] User has ${user.friendRequests.length} friend requests`);
        console.log(`[DEBUG] Raw friend request IDs:`, user.friendRequests);
        console.log(`[DEBUG] String friend request IDs:`, user.friendRequests.map(id => id.toString()));
        
        // Populate friend requests with user details
        const populatedUser = await User.findById(userId).populate('friendRequests', '_id userName email');
        
        if (!populatedUser) {
            console.log("[DEBUG] Failed to populate friend requests - user not found after population");
            return res.status(500).json({ error: "Failed to populate friend requests" });
        }
        
        console.log(`[DEBUG] Successfully populated friend requests`);
        console.log(`[DEBUG] Populated friend requests length: ${populatedUser.friendRequests.length}`);
        
        // Log each populated friend request for debugging
        populatedUser.friendRequests.forEach((friend, index) => {
            console.log(`[DEBUG] Friend request #${index + 1}:`, {
                id: friend._id.toString(),
                name: friend.userName,
                email: friend.email
            });
        });
        
        return res.status(200).json(populatedUser.friendRequests);
    } catch (error) {
        console.error("[DEBUG] Error fetching friend requests:", error);
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

// Get current user information
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId;
        
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Fix profile picture URL if it's a local URL
        if (user.profilePic && user.profilePic.includes('localhost')) {
            console.log('Detected local profile picture URL:', user.profilePic);
            // Return the user but with a flag indicating the profile pic needs migration
            user.profilePic = null;
            user._doc.needsProfilePicMigration = true;
        }
        
        console.log('Returning user data with profilePic:', user.profilePic);
        return res.status(200).json(user);
    } catch (error) {
        console.error("Error getting current user:", error);
        return res.status(500).json({ error: error.message });
    }
};

// Utility function to check friendship status (for debugging)
const checkFriendshipStatus = async (req, res) => {
    try {
        const { targetUserId } = req.query;
        const userId = req.userId;
        
        if (!targetUserId) {
            return res.status(400).json({ error: "Target user ID is required as a query parameter" });
        }
        
        console.log(`[DEBUG] Checking friendship status between ${userId} and ${targetUserId}`);
        
        // Get both users with all relevant friendship fields
        const [user, targetUser] = await Promise.all([
            User.findById(userId),
            User.findById(targetUserId)
        ]);
        
        if (!user || !targetUser) {
            return res.status(404).json({ error: "One or both users not found" });
        }
        
        // Convert ObjectIds to strings for easier comparison
        const userFriends = user.friends.map(id => id.toString());
        const userFriendRequests = user.friendRequests.map(id => id.toString());
        const userSentRequests = user.sentFriendRequests.map(id => id.toString());
        
        const targetFriends = targetUser.friends.map(id => id.toString());
        const targetFriendRequests = targetUser.friendRequests.map(id => id.toString());
        const targetSentRequests = targetUser.sentFriendRequests.map(id => id.toString());
        
        // Determine the friendship status
        const status = {
            areFriends: userFriends.includes(targetUserId) && targetFriends.includes(userId),
            userReceivedRequest: userFriendRequests.includes(targetUserId) && targetSentRequests.includes(userId),
            userSentRequest: userSentRequests.includes(targetUserId) && targetFriendRequests.includes(userId),
            noRelationship: !userFriends.includes(targetUserId) && 
                           !userFriendRequests.includes(targetUserId) && 
                           !userSentRequests.includes(targetUserId)
        };
        
        // Additional debug data
        const debug = {
            user: {
                id: user._id.toString(),
                name: user.userName,
                friends: userFriends,
                friendRequests: userFriendRequests,
                sentFriendRequests: userSentRequests
            },
            targetUser: {
                id: targetUser._id.toString(),
                name: targetUser.userName,
                friends: targetFriends,
                friendRequests: targetFriendRequests,
                sentFriendRequests: targetSentRequests
            }
        };
        
        return res.status(200).json({ status, debug });
        
    } catch (error) {
        console.error("[DEBUG] Error checking friendship status:", error);
        return res.status(500).json({ error: error.message });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        
        const { userName, bio, location, skills, socialLinks, profilePic } = req.body;
        
        // Only update fields that were provided
        const updateData = {};
        if (userName) updateData.userName = userName;
        if (bio !== undefined) updateData.bio = bio;
        if (location !== undefined) updateData.location = location;
        if (skills !== undefined) updateData.skills = skills;
        if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
        if (profilePic) updateData.profilePic = profilePic;
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select('-password');
        
        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }
        
        return res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({ error: error.message });
    }
};

// Update user theme preference
const updateTheme = async (req, res) => {
    try {
        const userId = req.userId;
        
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        
        const { theme } = req.body;
        
        if (!theme || !['light', 'dark', 'system'].includes(theme)) {
            return res.status(400).json({ error: "Invalid theme option" });
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { theme },
            { new: true }
        ).select('-password');
        
        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }
        
        return res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating theme:", error);
        return res.status(500).json({ error: error.message });
    }
};

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware
        
        console.log('Upload profile picture request received for user:', userId);
        
        // Check if a file was uploaded
        if (!req.file) {
            console.log('No file was uploaded');
            return res.status(400).json({ error: "No file uploaded" });
        }
        
        console.log('File received:', {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            buffer: req.file.buffer ? `${req.file.buffer.length} bytes` : 'No buffer'
        });
        
        // Upload to Cloudinary
        if (!req.file.buffer) {
            console.error('No file buffer available');
            return res.status(400).json({ error: "File buffer not available" });
        }
        
        try {
            // Upload to Cloudinary
            const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
                folder: 'profile_pictures',
                public_id: `user_${userId}_${Date.now()}`,
                overwrite: true
            });
            
            // The secure_url is the HTTPS URL of the uploaded image
            const fileUrl = cloudinaryResult.secure_url;
            console.log('Cloudinary upload successful, URL:', fileUrl);
            
            // Update the user's profile with the new picture URL from Cloudinary
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { profilePic: fileUrl },
                { new: true } // Return the updated document
            );
            
            if (!updatedUser) {
                console.error('User not found after successful upload');
                return res.status(404).json({ error: "User not found" });
            }
            
            return res.status(200).json({ 
                message: "Profile picture updated successfully",
                profilePic: fileUrl,
                user: updatedUser
            });
        } catch (cloudinaryError) {
            console.error('Cloudinary upload error:', cloudinaryError);
            return res.status(500).json({ 
                error: "Failed to upload to Cloudinary",
                details: cloudinaryError.message || 'Unknown error'
            });
        }
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        return res.status(500).json({ error: error.message || 'Server error' });
    }
};

// Check if user needs profile picture migration
const checkProfilePicMigration = async (req, res) => {
    try {
        const userId = req.userId;
        
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        
        const user = await User.findById(userId).select('profilePic');
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Check if the profile picture URL is a local URL
        const needsMigration = user.profilePic && (
            user.profilePic.includes('localhost') || 
            user.profilePic.includes('127.0.0.1') ||
            user.profilePic.startsWith('/uploads/')
        );
        
        return res.status(200).json({ 
            needsMigration,
            currentUrl: user.profilePic
        });
    } catch (error) {
        console.error("Error checking profile picture migration:", error);
        return res.status(500).json({ error: error.message });
    }
};

// Get all registered users (admin only)
const getAllRegisteredUsers = async (req, res) => {
    try {
        console.log("Admin user ID requesting all users:", req.userId);
        
        // Get all users with relevant fields for admin dashboard
        const users = await User.find({})
            .select('_id userName email isAdmin role createdAt profilePic');
        
        console.log(`Found ${users.length} users in the database`);
        
        // Add debugging information
        if (users.length === 0) {
            console.log("No users found in the database");
        }
        
        return res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching all users:", error);
        return res.status(500).json({ error: error.message });
    }
};

// Delete a user (admin only)
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Remove the user from friends lists and friend requests of other users
        await User.updateMany(
            { friends: userId },
            { $pull: { friends: userId } }
        );
        
        await User.updateMany(
            { friendRequests: userId },
            { $pull: { friendRequests: userId } }
        );
        
        await User.updateMany(
            { sentFriendRequests: userId },
            { $pull: { sentFriendRequests: userId } }
        );
        
        // Delete the user
        await User.findByIdAndDelete(userId);
        
        return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ error: error.message });
    }
};

// Toggle admin status (admin only)
const toggleAdminStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isAdmin } = req.body;
        
        // Check if boolean value was provided
        if (typeof isAdmin !== 'boolean') {
            return res.status(400).json({ error: "isAdmin must be a boolean value" });
        }
        
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Update admin status
        user.isAdmin = isAdmin;
        await user.save();
        
        return res.status(200).json({ 
            message: `User admin status updated successfully to ${isAdmin ? 'admin' : 'regular user'}`,
            user: {
                _id: user._id,
                userName: user.userName,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error("Error toggling admin status:", error);
        return res.status(500).json({ error: error.message });
    }
};

// Get user profiles by username list
const getProfilesByUsername = async (req, res) => {
    try {
        const { usernames } = req.body;
        
        if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
            return res.status(400).json({ error: "Invalid usernames list" });
        }
        
        console.log(`Fetching profiles for ${usernames.length} usernames:`, usernames);
        
        // Find all users matching the provided usernames
        const users = await User.find({ userName: { $in: usernames } })
            .select('_id userName profilePic');
        
        console.log(`Found ${users.length} matching profiles`);
        
        // Return the profiles with properly formatted profile pic URLs
        return res.status(200).json({ 
            profiles: users.map(user => ({
                _id: user._id,
                userName: user.userName,
                profilePic: user.profilePic
            }))
        });
    } catch (error) {
        console.error("Error fetching profiles by username:", error);
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
    getFriends,
    getCurrentUser,
    checkFriendshipStatus,
    updateProfile,
    updateTheme,
    uploadProfilePicture,
    getAllRegisteredUsers,
    deleteUser,
    toggleAdminStatus,
    checkProfilePicMigration,
    getProfilesByUsername
};