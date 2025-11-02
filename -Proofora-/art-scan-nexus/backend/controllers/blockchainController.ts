import { Request, Response } from "express";
import multer from "multer";
import {
  registerDesign,
  checkDesignExists,
  getDesignCount,
  getAccountBalance,
} from "../services/blockchainServices.ts";

// Configure multer for file upload
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

/**
 * Upload design and register on blockchain
 */
export async function uploadDesign(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Design title is required" });
    }

    console.log(`📤 Uploading design: ${title}`);

    // Register on blockchain
    const result = await registerDesign(req.file.buffer, title);

    res.json({
      success: true,
      message: "Design registered on blockchain!",
      data: {
        title,
        filename: req.file.originalname,
        size: req.file.size,
        blockchain: result,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: "Failed to register design",
      details: error.message,
    });
  }
}

/**
 * Compare/verify a design against blockchain
 */
export async function compareDesign(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`🔍 Checking design for plagiarism...`);

    // Check if exists on blockchain
    const exists = await checkDesignExists(req.file.buffer);

    if (exists) {
      return res.json({
        plagiarismDetected: true,
        message: "⚠️ This design is already registered on blockchain!",
        recommendation: "This design appears to be copyrighted.",
      });
    }

    res.json({
      plagiarismDetected: false,
      message: "✅ No match found. Design appears to be original.",
      recommendation: "You can proceed to register this design.",
    });
  } catch (error: any) {
    console.error("Compare error:", error);
    res.status(500).json({
      error: "Failed to check design",
      details: error.message,
    });
  }
}

/**
 * Get blockchain statistics
 */
export async function getStats(req: Request, res: Response) {
  try {
    const [designCount, balance] = await Promise.all([
      getDesignCount(),
      getAccountBalance(),
    ]);

    res.json({
      totalDesigns: designCount,
      balance: `${balance} APT`,
      network: "Aptos Testnet",
      account: process.env.APTOS_ACCOUNT,
    });
  } catch (error: any) {
    console.error("Stats error:", error);
    res.status(500).json({
      error: "Failed to fetch stats",
      details: error.message,
    });
  }
}
