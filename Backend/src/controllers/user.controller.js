// controller for handling request from user
import {User} from "../models/user.model.js";
import jwt from "jsonwebtoken";


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
                httpOnly: true,         // This cookie cannot be accessed by client side scripts
                secure: true,           // This cookie can only be sent over HTTPS
                sameSite: "none",       // This cookie can be sent to cross-site requests
            });

            return res.status(200).json({message: "Login successful" , userName: requestUser.userName });
        } else {
            return res.status(401).json({ error: "Login failed: Password Incorrect" });
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
export {loginConfirmation  , registerUser , logoutUser , refreshToken};