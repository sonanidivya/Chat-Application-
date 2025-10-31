import express from "express";
import { chatWithBot } from "../controllers/bot.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.post("/chat", chatWithBot);

export default router;


