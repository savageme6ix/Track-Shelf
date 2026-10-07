import express from "express";
import login from "../Controllers/loginController.js";

const router = express.Router();
router.get('/login',login);

export default router;