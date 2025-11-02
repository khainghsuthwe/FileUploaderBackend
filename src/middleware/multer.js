/**
 * middleware/upload.js
 * Hardened multer setup following OWASP file upload guidelines
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (process.env.VERCEL) {
  console.log("Running on Vercel — skipping local upload directory setup");
}
else(!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Cloudinary detection
const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME
);

// Allowed image types (strict whitelist)
const ALLOWED_EXTENSIONS = [".jpeg", ".jpg", ".png", ".gif"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Sanitize filename to avoid path traversal / special chars
function sanitizeFilename(originalName) {
  return originalName.replace(/[^\w.\-]/g, "_").substring(0, 120);
}

// File type validation (OWASP: whitelist by MIME and extension)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);

  if (isMimeAllowed && isExtAllowed) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Unsupported file type")
    );
  }
};

// Choose storage method based on Cloudinary configuration
let storage;
if (cloudinaryConfigured) {
  // Keep file in memory for direct Cloudinary streaming
  storage = multer.memoryStorage();
} else {
  // Local disk storage
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      const safeName = sanitizeFilename(path.parse(file.originalname).name);
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `${safeName}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });
}

// Export secure multer instance
exports.upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE, // Enforced by multer
    files: 1, // Optional: allow only one file at a time
  },
  fileFilter,
});
