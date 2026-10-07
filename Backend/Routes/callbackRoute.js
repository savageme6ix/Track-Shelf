import express from "express";
import callback from "../Controllers/loginController.js";

const router = express.Router();
router.get('/callback',callback);

export default router;