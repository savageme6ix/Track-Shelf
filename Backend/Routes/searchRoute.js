import express from "express";
import searchVid from "../Controllers/searchController.js";

const router = express.Router();
router.get("/search",searchVid);

export default router;