import express from "express";
import refresh_token from "../Controllers/refreshTokenController.js"

const router = express.Router();

router.post("/refresh_token",refresh_token );

export default router;
