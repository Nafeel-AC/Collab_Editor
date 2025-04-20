/** verify the token from the user */
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const verifyToken = async (req, res, next) => {
    try {
        console.log("Auth middleware called");
        
        // Get token from cookies, headers, or request body
        const token = req.cookies?.accesstoken || 
                     req.headers.authorization?.split(' ')[1] || 
                     req.body.accesstoken;

        // Check if token exists
        if (!token) {
            console.log("No token provided");
            return res.status(403).json({error: "A token is required for authentication"});
        }

        try {
            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            const userId = decoded.userId;
            
            console.log("Token verified for user ID:", userId);
            
            // Find the user in the database
            const user = await User.findById(userId).select("-password");
            
            if (!user) {
                console.log("User not found for token");
                return res.status(401).json({error: "Invalid token - user not found"});
            }

            // Add user and userId to the request
            req.user = user;
            req.userId = userId;
            next();
        } catch (tokenError) {
            console.error("Token verification error:", tokenError.message);
            
            // Handle expired token
            if (tokenError.name === 'TokenExpiredError') {
                return res.status(401).json({error: "Token expired", expired: true});
            }
            
            return res.status(401).json({error: "Invalid token"});
        }
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(401).json({error: `Authentication error: ${error.message}`});
    }
};

export { verifyToken };