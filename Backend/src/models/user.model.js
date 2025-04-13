// data base model for user
import mongoose from "mongoose"
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema ({
    userName: {
        type: String, 
        required: true, 
        trim: true,
        unique: true
    }, 
    email: {
        type: String , 
        required: true,
        unique: true,
    },
    password: {
        type: String , 
        required: true , 
        trim: true,
        min: 8,
    },
    friends: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    friendRequests: [{
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

/** helper methods of user for creating access and refresh token  */
userSchema.methods.createAccessToken = function() {
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
)};

userSchema.methods.createRefreshToken = function() {
    return jwt.sign(
        {
        userId: this._id
    }, 
    process.env.JWT_REFRESH_SECRET, 
    {
        expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
    }
)};

// Method to check if users are friends
userSchema.methods.isFriendWith = async function(userId) {
    // Ensure the user document is populated with friends
    if (!this.populated('friends')) {
        await this.populate('friends');
    }
    
    // Convert both IDs to strings for comparison
    const targetUserId = userId.toString();
    
    // Check if the user is in the friends array
    return this.friends.some(friend => friend._id.toString() === targetUserId);
};

// Static method to verify friendship between two users
userSchema.statics.verifyFriendship = async function(user1Id, user2Id) {
    try {
        console.log('Verifying friendship between:', { user1Id, user2Id });

        const [user1, user2] = await Promise.all([
            this.findById(user1Id).populate('friends'),
            this.findById(user2Id).populate('friends')
        ]);

        if (!user1 || !user2) {
            console.log('One or both users not found:', { user1: !!user1, user2: !!user2 });
            return false;
        }

        const user1IdStr = user1._id.toString();
        const user2IdStr = user2._id.toString();

        const user1HasUser2 = user1.friends.some(friend => friend._id.toString() === user2IdStr);
        const user2HasUser1 = user2.friends.some(friend => friend._id.toString() === user1IdStr);

        console.log('Friendship verification results:', {
            user1Id: user1IdStr,
            user2Id: user2IdStr,
            user1Friends: user1.friends.map(f => f._id.toString()),
            user2Friends: user2.friends.map(f => f._id.toString()),
            user1HasUser2,
            user2HasUser1
        });

        return user1HasUser2 && user2HasUser1;
    } catch (error) {
        console.error('Error in verifyFriendship:', error);
        return false;
    }
};

// Method to handle friend requests
userSchema.methods.handleFriendRequest = async function(fromUserId, accept) {
    try {
        console.log('Handling friend request:', {
            currentUser: this._id,
            fromUserId,
            accept
        });

        // Find the pending request
        const request = this.friendRequests.find(
            req => req.from.toString() === fromUserId.toString() && req.status === 'pending'
        );

        if (!request) {
            console.log('Friend request not found');
            throw new Error('Friend request not found');
        }

        // Update request status
        request.status = accept ? 'accepted' : 'rejected';

        if (accept) {
            // Add each other as friends if not already friends
            const fromUserIdStr = fromUserId.toString();
            const thisUserIdStr = this._id.toString();

            console.log('Current friends:', this.friends.map(id => id.toString()));

            // Check if they're already in each other's friends list
            const alreadyFriends = this.friends.some(id => id.toString() === fromUserIdStr);
            
            console.log('Already friends check:', { alreadyFriends });

            if (!alreadyFriends) {
                // Add to current user's friends
                this.friends.push(fromUserId);
                
                // Add to other user's friends
                const otherUser = await this.model('User').findById(fromUserId);
                if (otherUser) {
                    const otherAlreadyFriends = otherUser.friends.some(id => id.toString() === thisUserIdStr);
                    
                    console.log('Other user friend check:', {
                        otherUserId: otherUser._id,
                        otherUserFriends: otherUser.friends.map(id => id.toString()),
                        otherAlreadyFriends
                    });

                    if (!otherAlreadyFriends) {
                        otherUser.friends.push(this._id);
                        await otherUser.save();
                    }
                }
            }
        }

        await this.save();
        
        console.log('Friend request handled successfully:', {
            currentUserFriends: this.friends.map(id => id.toString()),
            status: request.status
        });

        return accept;
    } catch (error) {
        console.error('Error in handleFriendRequest:', error);
        throw error;
    }
};

export const User = mongoose.model("User" , userSchema);
