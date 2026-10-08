import express from "express";
import getMe from "../Controllers/meController.js";

const router = express.Router();
router.get('/me',getMe);

export default router;