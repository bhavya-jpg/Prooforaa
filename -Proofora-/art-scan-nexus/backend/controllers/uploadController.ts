import { Design } from "../models/designModel.js";
import { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { scanDesignWithML } from "../services/mlService.js";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadDesign = async (req: Request, res: Response) => {
  console.log("\n" + "=".repeat(70));
  console.log("📤 UPLOAD REQUEST RECEIVED");
  console.log("=".repeat(70));
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  try {
    // ✅ STEP 1: Validate request
    console.log("\n📋 STEP 1: Validating request...");
    console.log(`📋 Request body:`, req.body);
    console.log(`📁 Request file:`, req.file);

    const { title } = req.body;
    const designImage = req.file ? req.file.filename : "";

    if (!designImage) {
      console.error("❌ No file uploaded");
      return res.status(400).json({
        success: false,
        error: "NoFile",
        message: "No file uploaded",
      });
    }

    if (!title || !title.trim()) {
      console.error("❌ No title provided");
      return res.status(400).json({
        success: false,
        error: "NoTitle",
        message: "Design title is required",
      });
    }

    console.log(`✅ File uploaded: ${designImage}`);
    console.log(`✅ Title: ${title}`);

    // ✅ STEP 2: Verify file exists on disk
    console.log("\n📋 STEP 2: Verifying file on disk...");
    const uploadsDir = path.join(__dirname, "../../uploads");
    const filePath = path.join(uploadsDir, designImage);
    console.log(`📂 Full file path: ${filePath}`);

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

    // ✅ STEP 3: Scan design with ML API
    console.log("\n📋 STEP 3: Scanning design with ML API...");
    const scanResult = await scanDesignWithML(filePath);

    console.log("\n📥 ML SCAN RESULT:");
    console.log(JSON.stringify(scanResult, null, 2));

    if (!scanResult.success) {
      console.error("\n❌ ML SCAN FAILED:");
      console.error(`   Error: ${scanResult.error}`);
      console.error(`   Message: ${scanResult.message}`);

      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("🗑️  Cleaned up file after ML scan failure");
      }

      return res.status(500).json({
        success: false,
        error: scanResult.error,
        message: `ML scan failed: ${scanResult.message}`,
        details: scanResult.traceback,
      });
    }

    console.log("✅ ML scan successful!");

    // ✅ STEP 4: Extract file metadata
    console.log("\n📋 STEP 4: Extracting file metadata...");
    const stats = fs.statSync(filePath);
    const fileSize = `${(stats.size / 1024 / 1024).toFixed(2)} MB`;
    const format = path.extname(designImage).substring(1).toUpperCase();
    const dimensions = scanResult.metadata?.image_info
      ? `${scanResult.metadata.image_info.width}x${scanResult.metadata.image_info.height}`
      : "Unknown";

    console.log(`✅ File size: ${fileSize}`);
    console.log(`✅ Format: ${format}`);
    console.log(`✅ Dimensions: ${dimensions}`);

    // ✅ STEP 5: Prepare design document
    console.log("\n📋 STEP 5: Preparing design document...");

    const designData = {
      title,
      image: designImage,
      uploadDate: new Date(),
      status: "scanned", // After successful ML scan
      designId: scanResult.designId, // Unique fingerprint from ML
      scanDuration: scanResult.scanDuration,
      scanTimestamp: new Date(),
      metadata: scanResult.metadata, // Complete ML metadata
      fileSize,
      dimensions,
      format,
      blockchainHash: null, // Placeholder for teammate
      transactionHash: null, // Placeholder for teammate
      blockchainStatus: "pending", // Placeholder for teammate
    };

    console.log(`✅ Design data prepared`);
    console.log(`   - Design ID: ${designData.designId}`);
    console.log(`   - Status: ${designData.status}`);
    console.log(`   - Scan duration: ${designData.scanDuration}s`);

    // ✅ STEP 6: Save to MongoDB
    console.log("\n📋 STEP 6: Saving to MongoDB...");
    const newDesign = new Design(designData);
    const savedDesign = await newDesign.save();

    console.log(`✅ Design saved to MongoDB!`);
    console.log(`   - MongoDB ID: ${savedDesign._id}`);
    console.log(`   - Design ID: ${savedDesign.designId}`);

    // ✅ STEP 7: Prepare response
    console.log("\n📋 STEP 7: Preparing response...");
    const responseData = {
      success: true,
      message: "Design uploaded and scanned successfully!",
      design: {
        // MongoDB info
        id: savedDesign._id,
        mongoId: savedDesign._id,

        // Basic info
        title: savedDesign.title,
        image: savedDesign.image,
        imageUrl: `/uploads/${savedDesign.image}`,

        // Design fingerprint
        designId: savedDesign.designId,
        fingerprint: savedDesign.metadata?.hashes?.design_fingerprint,

        // Status
        status: savedDesign.status,
        uploadDate: savedDesign.uploadDate,

        // Scan info
        scanDuration: savedDesign.scanDuration,
        scanTimestamp: savedDesign.scanTimestamp,

        // File info
        fileSize: savedDesign.fileSize,
        dimensions: savedDesign.dimensions,
        format: savedDesign.format,

        // Blockchain (placeholder)
        blockchainStatus: savedDesign.blockchainStatus,
        blockchainHash: savedDesign.blockchainHash,
        transactionHash: savedDesign.transactionHash,

        // Complete metadata (for debugging)
        metadata: savedDesign.metadata,
      },
    };

    console.log("\n" + "=".repeat(70));
    console.log("✅ UPLOAD COMPLETE!");
    console.log("=".repeat(70));
    console.log(`✅ Design ID: ${responseData.design.designId}`);
    console.log(`✅ MongoDB ID: ${responseData.design.id}`);
    console.log(`✅ Status: ${responseData.design.status}`);
    console.log("=".repeat(70) + "\n");

    res.status(200).json(responseData);
  } catch (error: any) {
    console.error("\n" + "=".repeat(70));
    console.error("❌ UPLOAD ERROR");
    console.error("=".repeat(70));
    console.error(`Error type: ${error.constructor.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`\n📋 Stack trace:`);
    console.error(error.stack);
    console.error("=".repeat(70) + "\n");

    // Clean up file on error
    if (req.file) {
      const filePath = path.join(__dirname, "../../uploads", req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("🗑️  Cleaned up file after error");
      }
    }

    res.status(500).json({
      success: false,
      error: error.name || "UploadError",
      message: "Error uploading design. Please try again.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getAllDesigns = async (req: Request, res: Response) => {
  console.log("\n📋 GET ALL DESIGNS REQUEST");

  try {
    const designs = await Design.find().sort({ uploadDate: -1 });
    console.log(`✅ Found ${designs.length} designs\n`);

    res.status(200).json({
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
    console.error("❌ Fetch error:", error);
    res.status(500).json({
      success: false,
      error: "FetchError",
      message: "Error fetching designs",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
