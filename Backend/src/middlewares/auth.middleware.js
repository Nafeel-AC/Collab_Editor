/** verify the token from the user */
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyToken = async (req, res, next) => {
    try {
        // Get token from Authorization header (Bearer token) or from cookies
        const token = req.cookies?.accesstoken || 
                    (req.headers.authorization && req.headers.authorization.split(' ')[1]) || 
                    req.body.token;

        if (!token) {
            return res.status(401).json({ error: "Access denied. No token provided." });
        }

        try {
            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            req.userId = decoded.userId;
            next();
        } catch (error) {
            return res.status(401).json({ error: "Invalid token." });
        }
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

// Middleware to check if user is admin
export const isAdmin = async (req, res, next) => {
    try {
        // Get user from database (userId should be set by verifyToken middleware)
        const user = await User.findById(req.userId);
        
        if (!user) {
            console.log("User not found in isAdmin middleware for ID:", req.userId);
            return res.status(404).json({ error: "User not found." });
        }
        
        console.log("Checking admin status for user:", user.userName);
        console.log("isAdmin flag:", user.isAdmin);
        console.log("Role value:", user.role);
        
        // Check if user is admin (using both isAdmin flag and role field)
        if (user.isAdmin !== true && user.role !== 'admin') {
            console.log("Access denied - user is not admin");
            return res.status(403).json({ error: "Access denied. Admin privileges required." });
        }
        
        console.log("Admin access granted for user:", user.userName);
        // User is admin, proceed to next middleware
        next();
    } catch (error) {
        console.error("Admin check middleware error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};