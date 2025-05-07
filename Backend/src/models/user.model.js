// data base model for user
import mongoose from "mongoose"
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema ({
    userName: {
        type: String, 
        required: true, 
        trim: true,
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
    profilePic: {
        type: String,
        default: "https://ui-avatars.com/api/?background=random"
    },
    bio: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        enum: ["admin", "user"],
        default: "user"
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    skills: [{
        type: String
    }],
    location: {
        type: String,
        default: ""
    },
    socialLinks: {
        github: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        twitter: { type: String, default: "" }
    },
    theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system"
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    friendRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    sentFriendRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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


export const User = mongoose.model("User" , userSchema);
