import express from "express";
import callback from "../Controllers/callbackController.js";

const router = express.Router();
router.get('/callback',callback);

export default router;