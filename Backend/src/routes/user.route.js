// route definations for the user
import { Router } from "express";
import {
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
    checkFriendshipStatus
} from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/login-confirmation").post(loginConfirmation);
router.route("/login").post(loginConfirmation);

router.route("/register-user").post(registerUser)
router.route("/signup").post(registerUser);

router.route("/login-page").get((req , res) => {
    /** when user wants to login it should receive the login page */
    res.render("login");
})

router.route("/register-page").get((req , res) => {
    /** when user hits this api end point send the user registration page */
    res.render("register");
})

router.route("/logout").get(verifyToken , logoutUser);
router.route("/refresh-token").post(refreshToken);

// Current user route
router.route("/me").get(verifyToken, getCurrentUser);

// Friend-related routes
router.route("/all").get(verifyToken, getAllUsers);
router.route("/friends").get(verifyToken, getFriends);
router.route("/friend-requests").get(verifyToken, getFriendRequests);
router.route("/send-friend-request").post(verifyToken, sendFriendRequest);
router.route("/accept-friend-request").post(verifyToken, acceptFriendRequest);
router.route("/reject-friend-request").post(verifyToken, rejectFriendRequest);

// Debug endpoints
router.route("/check-friendship").get(verifyToken, checkFriendshipStatus);

export default router;