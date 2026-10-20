import express from "express";
import searchVid, { checkLocalTrack } from "../Controllers/searchController.js";

const router = express.Router();
router.get("/search",searchVid);
router.post("/local-check", checkLocalTrack);

export default router;
