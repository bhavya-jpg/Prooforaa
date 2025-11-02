import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { scanDesignWithML } from "../services/mlService.ts";
import { Design } from "../models/designModel.ts";

// ✅ Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ====================================
// MULTER CONFIGURATION
// ====================================
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`📂 Saving file to: ${uploadsDir}`);
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
    console.log(`🔍 Checking file: ${file.mimetype} - ${file.originalname}`);
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
      cb(new Error("Only image files (jpg, png, gif, webp, svg) are allowed"));
    }
  },
});

// ====================================
// ROUTES
// ====================================

/**
 * POST /api/designs/save
 * Upload and scan a design
 */
router.post(
  "/save",
  upload.single("design"),
  async (req: Request, res: Response) => {
    console.log("\n" + "=".repeat(70));
    console.log("📥 DESIGN UPLOAD REQUEST (designRoutes)");
    console.log("=".repeat(70));

    try {
      // ✅ Validate file
      if (!req.file) {
        console.error("❌ No file uploaded");
        return res.status(400).json({
          success: false,
          error: "NoFile",
          message: "No file uploaded",
        });
      }

      console.log(`📁 File uploaded: ${req.file.filename}`);
      console.log(`📋 Request body:`, req.body);

      const { title } = req.body;

      if (!title || !title.trim()) {
        console.error("❌ No title provided");

        // Clean up file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log("🗑️  Cleaned up file");
        }

        return res.status(400).json({
          success: false,
          error: "NoTitle",
          message: "Design title is required",
        });
      }

      // ✅ Verify file exists
      const filePath = req.file.path;
      console.log(`📂 File path: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found at ${filePath}`);
        return res.status(500).json({
          success: false,
          error: "FileNotSaved",
          message: "File was not saved properly",
        });
      }

      const fileStats = fs.statSync(filePath);
      console.log(
        `✅ File verified: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`
      );

      // ✅ Perform ML scan
      console.log("🔍 Starting ML scan...");
      const mlResult = await scanDesignWithML(filePath);

      console.log("📥 ML Scan Result:", JSON.stringify(mlResult, null, 2));

      if (!mlResult.success) {
        console.error("❌ ML scan failed:", mlResult.message);

        // Clean up file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("🗑️  Cleaned up file after ML scan failure");
        }

        return res.status(500).json({
          success: false,
          error: mlResult.error,
          message: `ML scan failed: ${mlResult.message}`,
        });
      }

      console.log("✅ ML scan successful!");

      // ✅ Extract metadata
      const fileSize = `${(fileStats.size / 1024 / 1024).toFixed(2)} MB`;
      const format = path.extname(req.file.filename).substring(1).toUpperCase();
      const dimensions = mlResult.metadata?.image_info
        ? `${mlResult.metadata.image_info.width}x${mlResult.metadata.image_info.height}`
        : "Unknown";

      console.log(`📊 File size: ${fileSize}`);
      console.log(`📊 Format: ${format}`);
      console.log(`📊 Dimensions: ${dimensions}`);

      // ✅ Save to MongoDB
      console.log("💾 Saving to MongoDB...");
      const newDesign = new Design({
        title,
        image: req.file.filename,
        uploadDate: new Date(),
        status: "scanned",
        designId: mlResult.designId,
        scanDuration: mlResult.scanDuration,
        scanTimestamp: new Date(),
        metadata: mlResult.metadata,
        fileSize,
        dimensions,
        format,
        blockchainHash: null,
        transactionHash: null,
        blockchainStatus: "pending",
      });

      const savedDesign = await newDesign.save();
      console.log(`✅ Design saved to MongoDB: ${savedDesign._id}`);
      console.log("=".repeat(70) + "\n");

      // ✅ Return response
      res.status(201).json({
        success: true,
        message: "Design uploaded and scanned successfully!",
        design: {
          id: savedDesign._id,
          mongoId: savedDesign._id,
          title: savedDesign.title,
          image: savedDesign.image,
          imageUrl: `/uploads/${savedDesign.image}`,
          designId: savedDesign.designId,
          fingerprint: savedDesign.metadata?.hashes?.design_fingerprint,
          status: savedDesign.status,
          uploadDate: savedDesign.uploadDate,
          scanDuration: savedDesign.scanDuration,
          scanTimestamp: savedDesign.scanTimestamp,
          fileSize: savedDesign.fileSize,
          dimensions: savedDesign.dimensions,
          format: savedDesign.format,
          blockchainStatus: savedDesign.blockchainStatus,
          blockchainHash: savedDesign.blockchainHash,
          transactionHash: savedDesign.transactionHash,
          metadata: savedDesign.metadata,
        },
      });
    } catch (error: any) {
      console.error("\n" + "=".repeat(70));
      console.error("❌ UPLOAD ERROR (designRoutes)");
      console.error("=".repeat(70));
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Stack trace:`);
      console.error(error.stack);
      console.error("=".repeat(70) + "\n");

      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log("🗑️  Cleaned up file after error");
      }

      res.status(500).json({
        success: false,
        error: error.name || "UploadError",
        message: error.message || "Upload failed",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

/**
 * GET /api/designs
 * Get all designs from MongoDB
 */
router.get("/", async (req: Request, res: Response) => {
  console.log("\n📋 GET ALL DESIGNS (designRoutes)");

  try {
    const designs = await Design.find().sort({ uploadDate: -1 });
    console.log(`✅ Found ${designs.length} designs\n`);

    res.json({
      success: true,
      count: designs.length,
      designs: designs.map((d) => ({
        id: d._id,
        title: d.title,
        image: d.image,
        imageUrl: `/uploads/${d.image}`,
        designId: d.designId,
        status: d.status,
        uploadDate: d.uploadDate,
        scanDuration: d.scanDuration,
        fileSize: d.fileSize,
        dimensions: d.dimensions,
        format: d.format,
        blockchainStatus: d.blockchainStatus,
        blockchainHash: d.blockchainHash,
        transactionHash: d.transactionHash,
        metadata: d.metadata,
      })),
    });
  } catch (error: any) {
    console.error("❌ Fetch error (designRoutes):", error);
    res.status(500).json({
      success: false,
      error: "FetchError",
      message: "Failed to fetch designs",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * GET /api/designs/:id
 * Get a single design by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  console.log(`\n📋 GET DESIGN BY ID: ${req.params.id}`);

  try {
    const design = await Design.findById(req.params.id);

    if (!design) {
      console.error("❌ Design not found");
      return res.status(404).json({
        success: false,
        error: "NotFound",
        message: "Design not found",
      });
    }

    console.log(`✅ Design found: ${design.title}\n`);

    res.json({
      success: true,
      design: {
        id: design._id,
        title: design.title,
        image: design.image,
        imageUrl: `/uploads/${design.image}`,
        designId: design.designId,
        status: design.status,
        uploadDate: design.uploadDate,
        scanDuration: design.scanDuration,
        fileSize: design.fileSize,
        dimensions: design.dimensions,
        format: design.format,
        blockchainStatus: design.blockchainStatus,
        blockchainHash: design.blockchainHash,
        transactionHash: design.transactionHash,
        metadata: design.metadata,
      },
    });
  } catch (error: any) {
    console.error("❌ Fetch error:", error);
    res.status(500).json({
      success: false,
      error: "FetchError",
      message: "Failed to fetch design",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ====================================
// LOGGING
// ====================================
console.log("✅ Design routes configured:");
console.log("   POST /save - Upload design");
console.log("   GET / - Get all designs");
console.log("   GET /:id - Get design by ID");

export default router;
