import express from "express";
import {
  uploadDesign,
  compareDesign,
  getStats,
  upload,
} from "../controllers/blockchainController.ts";

const router = express.Router();

// Upload and register design on blockchain
router.post("/upload", upload.single("design"), uploadDesign);

// Check if design exists (plagiarism check)
router.post("/compare", upload.single("design"), compareDesign);



// Get blockchain statistics
router.get("/stats", getStats);

export default router;
