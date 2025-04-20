import { Router } from "express";
import { executeCode } from "../controllers/execute.controller.js";

const router = Router();

// Execute code using Gemini
router.route("/").post(executeCode);

export { router }; 