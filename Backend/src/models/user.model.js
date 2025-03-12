// data base model for user
import mongoose from "mongoose"

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
    }
})


export const User = mongoose.model("User" , userSchema);
