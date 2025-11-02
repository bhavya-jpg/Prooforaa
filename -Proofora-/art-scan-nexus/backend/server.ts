import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import connectDB from "./config.js";
import { User } from "./models/userModel.js";
import Auth from "./utils/auth.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import designRoutes from "./routes/designRoutes.js"; // 👈 change .ts → .js if compiled
import compareRoutes from "./routes/compareRoute.js";
import blockchainRoutes from "./routes/blockchainRoutes.js";

// Blockchain setup
import { initializeRegistry } from "./services/blockchainServices.js"; // 👈 also .js if compiled

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5001;

// ================== Upload Directory Setup ==================
const uploadsDir = path.join(__dirname, "../uploads");
console.log("Uploads directory path:", uploadsDir);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
} else {
  console.log("📁 Uploads directory already exists");
}

// ================== Middleware Setup ==================
app.use(
  cors({
    origin: ["http://localhost:8081", "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static uploaded files
app.use("/uploads", express.static(uploadsDir));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ================== ROUTES ==================
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/compare", compareRoutes);
app.use("/api/blockchain", blockchainRoutes);

console.log(
  "✅ Routes registered: /api/auth, /api/upload, /api/designs, /api/compare, /api/blockchain"
);

// ================== Error Handling ==================
app.use((req: Request, res: Response) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("🚨 Unhandled Error:", err.message);
  res.status(500).json({ success: false, message: err.message });
});

// ================== START SERVER ==================
const start = async () => {
  try {
    console.log("\n🚀 Starting Proofora Backend...");
    console.log(`Port: ${port}`);

    const dbConnected = await connectDB();
    if (!dbConnected) {
      console.error("❌ Database connection unavailable. Check MongoDB setup.");
      process.exit(1);
    }

    console.log("✅ MongoDB connected successfully");

    await initializeRegistry();

    const server = app.listen(port, () => {
      console.log(`✅ Server running on http://localhost:${port}`);
      console.log(`➡️ Upload: /api/designs/save`);
      console.log(`➡️ Compare: /api/compare/compare`);
      console.log(`➡️ Blockchain: /api/blockchain/stats`);
    });

    // ✅ FIXED: safer error typing
    server.on("error", (error: NodeJS.ErrnoException) => {
      console.error("❌ Server error:", error.message);
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use.`);
      }
      process.exit(1);
    });

    // ================== Optional: Seed Users ==================
    const seedUsers = [
      {
        fullName: "Bhavya Aggarwal",
        email: "bhavya@gmail.com",
        password: "password123",
      },
      {
        fullName: "Rijul Rangta",
        email: "rijul@gmail.com",
        password: "password1234",
      },
      {
        fullName: "Vanni Chauhan",
        email: "vanni@gmail.com",
        password: "password1235",
      },
    ];

    for (const su of seedUsers) {
      const existing = await User.findOne({ email: su.email });
      if (!existing) {
        const doc = new User(su);
        await doc.save();
        const token = Auth.generateToken(doc._id.toString());
        (doc as any).token = token;
        await doc.save();
        console.log(`👤 Seeded user: ${su.email}`);
      }
    }

    if (!process.env.JWT_SECRET) {
      console.warn("⚠️ JWT_SECRET missing in .env file");
    }

    console.log("\n✅ Backend fully initialized!");
  } catch (error: any) {
    console.error("❌ Failed to start server:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

start();
