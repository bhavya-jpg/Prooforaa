import express from "express";
import blockchainRoutes from "./routes/blockchainRoutes.ts";
import { initializeRegistry } from "./services/blockchainServices.ts";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB from "./config.ts";
import authRoutes from "./routes/authRoutes.ts";
import { User } from "./models/userModel.ts";
import Auth from "./utils/auth.js";
import uploadRoutes from "./routes/uploadRoutes.ts";
import designRoutes from "./routes/designRoutes.ts";
import compareRoutes from "./routes/compareRoute.ts";

dotenv.config();

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5001;

// Create uploads directory
const uploadsDir = path.join(__dirname, "../uploads");
console.log("Uploads directory path:", uploadsDir);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
} else {
  console.log("Uploads directory already exists");
}

// Middleware setup
app.use(
  cors({
    origin: [
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:8082",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

app.use(express.json());

// Handle JSON parsing errors
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ message: "Invalid JSON in request body" });
    }
    next(err);
  }
);

// Add default Content-Type for JSON
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return originalJson(body);
  };
  next();
});

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Serve uploaded files
app.use("/uploads", express.static(uploadsDir));
console.log("Serving uploads from:", uploadsDir);

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use("/api/compare", compareRoutes);
console.log(
  "Routes registered: /api/auth, /api/upload, /api/designs, /api/blockchain, /api/compare"
);

// 404 Handler
app.use((req: express.Request, res: express.Response) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (res.headersSent) return next(err);

    console.error("Unhandled error:", err);
    console.error("Error stack:", err.stack);

    res.status(err.status || 500).json({
      message: err.message || "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
);

const start = async () => {
  try {
    console.log("Starting server...");
    console.log(`Port: ${port}`);

    // ✅ Connect MongoDB FIRST
    const dbConnected = await connectDB();
    if (!dbConnected) {
      console.error("MongoDB connection failed. Stopping server startup.");
      process.exit(1);
    }

    // ✅ Initialize Blockchain AFTER DB
    await initializeRegistry();

    // ✅ Start Express Server
    const server = app.listen(port, () => {
      console.log(`✅ Server running on port ${port}`);
      console.log(
        `Upload endpoint: http://localhost:${port}/api/designs/save`
      );
      console.log(
        `Compare endpoint: http://localhost:${port}/api/compare/compare`
      );
    });

    server.on("error", (error: any) => {
      console.error("Server error:", error);
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use.`);
        process.exit(1);
      }
    });

    // ✅ Seed Users (only if connected)
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
      try {
        const existing = await User.findOne({ email: su.email });
        if (!existing) {
          const doc = new User(su);
          await doc.save();
          const token = Auth.generateToken(doc._id.toString());
          (doc as any).token = token;
          await doc.save();
          console.log(`Seeded user: ${su.email}`);
        } else {
          console.log(`User ${su.email} already exists`);
        }
      } catch (seedError: any) {
        console.error(`Error seeding user ${su.email}:`, seedError.message);
      }
    }

    if (!process.env.JWT_SECRET) {
      console.warn("JWT_SECRET not set in .env file");
    }
  } catch (error: any) {
    console.error("Failed to start server:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

start().catch((error) => {
  console.error("Unhandled error in start():", error);
  process.exit(1);
});
