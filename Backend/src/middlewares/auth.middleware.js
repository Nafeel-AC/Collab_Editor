/** verify the token from the user */
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyToken = async (req, res, next) => {
    try {
        console.log('Verifying token...');
        
        // Get token from header
        const authHeader = req.headers.authorization;
        console.log('Auth header:', authHeader);

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('No token found in header');
            return res.status(401).json({ error: "No token found" });
        }

        const token = authHeader.split(' ')[1];
        console.log('Token extracted:', token ? 'Present' : 'Missing');

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            console.log('Token decoded:', decoded);

            // Get user from token
            const user = await User.findById(decoded.userId);
            if (!user) {
                console.log('User not found for token');
                return res.status(404).json({ error: "User not found" });
            }

            // Attach user to request object
            req.user = user;
            console.log('User attached to request:', user._id);
            next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ error: "Invalid token" });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: error.message });
    }
};