/** verify the token from the user */
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


const verifyToken = async (req , res , next ) => {
    const token = req.cookies?.accesstoken || req.body.accesstoken ;
    if (!token) {
        return res.status(403).json({error: "A token is required for authentication"});
    }

    try {
        const userId = jwt.verify(token , process.env.JWT_ACCESS_SECRET).userId;
        const user = User.findById(userId).select("-password");
        if (!user) {
            return res.status(401).json({error: "Invalid token"});
        }

        req.user = user ;
        next();
    } catch (error) {
        return res.status(401).json({error: `Invalid token ${error}`});
    }
}

export {verifyToken };