// route definations for the user
import { User } from "../models/user.model.js";
import { Router } from "express";
import {loginConfirmation , registerUser} from "../controllers/user.controller.js";
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
export {router};