import express from "express";
import getPlaylist from "../Controllers/playlistController.js"

const router = express.Router();

router.post("/playlist",getPlaylist );

export default router;
