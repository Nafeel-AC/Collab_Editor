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
    checkFriendshipStatus,
    updateProfile,
    updateTheme,
    uploadProfilePicture,
    deleteUser,
    toggleAdminStatus,
    getAllRegisteredUsers,
    checkProfilePicMigration,
    getProfilesByUsername
} from "../controllers/user.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";
import loggingUpload from "../middlewares/upload.middleware.js";
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

// Profile routes
router.route("/profile").put(verifyToken, updateProfile);
router.route("/theme").put(verifyToken, updateTheme);
router.route("/profile-picture").post(verifyToken, loggingUpload.single('profilePic'), uploadProfilePicture);
router.route("/check-profile-migration").get(verifyToken, checkProfilePicMigration);

// Get all users (for normal users - excludes friends and friend requests)
router.route("/all").get(verifyToken, getAllUsers);

// Admin routes (protected with isAdmin middleware)
router.route("/all-users").get(verifyToken, isAdmin, getAllRegisteredUsers); // Get all registered users
router.route("/:userId").delete(verifyToken, isAdmin, deleteUser); // Delete a user
router.route("/:userId/admin").put(verifyToken, isAdmin, toggleAdminStatus); // Toggle admin status

// Friend-related routes
router.route("/friends").get(verifyToken, getFriends);
router.route("/friend-requests").get(verifyToken, getFriendRequests);
router.route("/send-friend-request").post(verifyToken, sendFriendRequest);
router.route("/accept-friend-request").post(verifyToken, acceptFriendRequest);
router.route("/reject-friend-request").post(verifyToken, rejectFriendRequest);

// Debug endpoints
router.route("/check-friendship").get(verifyToken, checkFriendshipStatus);

// Add the new route for getting profiles by username
router.route("/profiles-by-username").post(verifyToken, getProfilesByUsername);

export default router;