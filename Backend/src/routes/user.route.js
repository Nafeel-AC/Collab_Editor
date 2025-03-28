// route definations for the user
import { Router } from "express";
import {loginConfirmation , registerUser , logoutUser  , refreshToken } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/login-confirmation").post(loginConfirmation);

router.route("/register-user").post(registerUser)

router.route("/login-page").get((req , res) => {
    /** when user wants to login it should receive the login page */
    res.send("Login page");
})

router.route("/register-page").get((req , res) => {
    /** when user hits this api end point send the user registration page */
    res.send("Register user page")
})

router.route("/logout").get(verifyToken , logoutUser);
router.route("/refresh-token").get(refreshToken);


export {router};