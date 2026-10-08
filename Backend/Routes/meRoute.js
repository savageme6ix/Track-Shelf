import express from "express";
import getMe from "../Controllers/loginController.js";

const router = express.Router();
router.get('/me',getMe);

export default router;