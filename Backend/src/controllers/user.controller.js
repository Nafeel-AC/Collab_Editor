// controller for handling request from user
import {User} from "../models/user.model.js";

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
            return res.status(200).json({message: "Login successful"});
        } else {
            return res.status(401).json({ message: "Login failed" });
        }

    } catch (error) {
        // Catch any unexpected errors and send an error response
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
            password: req.body.password
        })
        await newUser.save();
        return res.status(200).json({message: "User registered successfully"})
    } catch(error) {
        console.log(error)
        res.status(400).json({error: error.message});
    }
}

export {loginConfirmation , registerUser}