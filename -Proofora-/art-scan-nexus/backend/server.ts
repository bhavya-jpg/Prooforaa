import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "./config.js";
import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import compareRoutes from "./routes/compareRoute.js";
import { User } from "./models/userModel.js";
import Auth from "./utils/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Create uploads directory
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

// CORS
app.use(
  cors({
    origin: ["http://localhost:8081", "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Static files
app.use("/uploads", express.static(uploadsDir));

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/designs", uploadRoutes); // Main upload route
app.use("/api/compare", compareRoutes);

console.log("✅ Routes:");
console.log("   /api/auth");
console.log("   /api/designs/save");
console.log("   /api/designs/all");
console.log("   /api/compare");

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (res.headersSent) return next(err);

    console.error("\n❌ ERROR:", err.message);
    console.error(err.stack);

    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
);

// Start server
const start = async () => {
  try {
    console.log("\n🚀 STARTING PROOFORA BACKEND");
    console.log(`Port: ${port}`);
    console.log(`ML API: ${process.env.ML_API_URL || "http://localhost:8000"}`);

    const server = app.listen(port, () => {
      console.log(`✅ Server: http://localhost:${port}`);
      console.log(`✅ Upload: http://localhost:${port}/api/designs/save`);
      console.log(`✅ Designs: http://localhost:${port}/api/designs/all\n`);
    });

    const dbConnected = await connectDB();
    if (dbConnected) {
      console.log("✅ MongoDB connected\n");
    }

    console.log("✅ BACKEND READY\n");
  } catch (error: any) {
    console.error("\n❌ FAILED TO START:", error.message);
    process.exit(1);
  }
};

start();
