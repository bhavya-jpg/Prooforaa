import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  uploadDesign,
  getAllDesigns,
} from "../controllers/uploadController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Create uploads directory
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`📂 Multer saving to: ${uploadsDir}`);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `design-${Date.now()}-${Math.floor(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    console.log(`📝 Generated filename: ${uniqueName}`);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    console.log(`🔍 File check: ${file.mimetype} - ${file.originalname}`);
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      console.log("✅ File type allowed");
      return cb(null, true);
    } else {
      console.error("❌ File type not allowed");
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Routes
router.post("/save", upload.single("design"), uploadDesign);
router.get("/all", getAllDesigns);

console.log("✅ Upload routes configured");
console.log("   POST /save - Upload design");
console.log("   GET /all - Get all designs");

export default router;
