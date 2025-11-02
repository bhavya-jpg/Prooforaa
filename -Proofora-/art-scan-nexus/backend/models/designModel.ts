import mongoose from "mongoose";

const designSchema = new mongoose.Schema({
  // Basic Info
  title: { type: String, required: true },
  description: { type: String },
  image: { type: String, required: true }, // filename
  uploadDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "scanned", "verified", "flagged"],
    default: "scanned", // After ML scan
  },

  // ML Scan Results (Design Fingerprint)
  designId: { type: String, unique: true, required: true }, // From ML (design_fingerprint)
  scanDuration: { type: Number }, // seconds
  scanTimestamp: { type: Date },

  // Complete ML Metadata
  metadata: {
    scan_timestamp: { type: String },
    image_info: {
      width: { type: Number },
      height: { type: Number },
      format: { type: String },
      mode: { type: String },
      total_pixels: { type: Number },
      aspect_ratio: { type: Number },
    },
    hashes: {
      perceptual_hash: { type: String },
      average_hash: { type: String },
      difference_hash: { type: String },
      wavelet_hash: { type: String },
      color_hash: { type: String },
      sha256: { type: String },
      design_fingerprint: { type: String }, // Unique identifier
    },
    color_analysis: { type: mongoose.Schema.Types.Mixed },
    texture_features: { type: mongoose.Schema.Types.Mixed },
    orb_features: { type: mongoose.Schema.Types.Mixed },
    pixel_statistics: { type: mongoose.Schema.Types.Mixed },
    edge_features: { type: mongoose.Schema.Types.Mixed },
    frequency_features: { type: mongoose.Schema.Types.Mixed },
    scan_metadata: { type: mongoose.Schema.Types.Mixed },
  },

  // Blockchain (Placeholder for your teammate)
  blockchainHash: { type: String, default: null },
  transactionHash: { type: String, default: null },
  blockchainStatus: {
    type: String,
    enum: ["pending", "processing", "confirmed", "failed"],
    default: "pending", // Your teammate will update this
  },

  // File Info
  fileSize: { type: String },
  dimensions: { type: String },
  format: { type: String },
});

// Index for fast lookups
designSchema.index({ designId: 1 });
designSchema.index({ uploadDate: -1 });

const Design = mongoose.model("Design", designSchema);

export { Design };
