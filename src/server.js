const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const uploadRoutes = require("./routes/upload");

const app = express();
const PORT = process.env.PORT || 5001;

// Security Middleware (OWASP)
// Allow resources (images) to be loaded cross-origin by setting the policy
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, //100 requests per IP
  handler: (req, res) => {
    res
      .status(429)
      .json({ error: "Too many login attempts, try again later." });
  },
});
app.use("/api/upload", limiter);

// Serve uploaded files and ensure static responses include CORS headers
const uploadsPath = path.join(__dirname, "../uploads");
// Ensure uploads directory exists (create on startup if deleted)
try {
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log(`Created uploads directory at ${uploadsPath}`);
  }
} catch (err) {
  console.error(`Failed to create uploads directory at ${uploadsPath}:`, err);
}

const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
app.use(
  "/uploads",
  express.static(uploadsPath, {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", frontendOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    },
  })
);

// Routes
app.use("/api/upload", uploadRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  const uptime = process.uptime();
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.FRONTEND_URL || "http://localhost:3000"
  );
  res.json({
    status: "ok",
    uptime: Math.round(uptime),
    timestamp: Date.now(),
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
