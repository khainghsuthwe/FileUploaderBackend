/**
 * uploadController.js
 * Secure file upload controller aligned with OWASP best practices.
 */

const fs = require("fs");
const path = require("path");

// ---------- Configuration ----------
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ---------- Cloudinary Setup ----------
const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME
);

let cloudinary, streamifier;
if (cloudinaryConfigured) {
  cloudinary = require("cloudinary").v2;
  streamifier = require("streamifier");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ---------- Utility Helpers ----------

// sanitize filename (avoid traversal and special chars)
function sanitizeFilename(name) {
  return name.replace(/[^\w.\-]/g, "_").substring(0, 120);
}

// simple error logger
function logError(context, err) {
  console.error(`[${new Date().toISOString()}] [${context}]`, {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
}

// Build file URL for local storage
function buildFileUrl(filename) {
  const base =
    process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;
  return `${base}/uploads/${filename}`;
}

// ---------- Upload Controller ----------

exports.uploadFile = async (req, res) => {
  try {
    // Basic validation
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // File type validation (OWASP: whitelist approach)
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    // File size validation (should also be enforced by multer)
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: "File too large (max 5MB)" });
    }

    // Safe original name
    const originalName = sanitizeFilename(req.file.originalname || "file");

    // ---- Cloudinary Upload (preferred) ----
    if (req.file.buffer && cloudinaryConfigured) {
      const folder = process.env.CLOUDINARY_FOLDER || "fileuploader";
      // const uploadStream = cloudinary.uploader.upload_stream(
      //   {
      //     folder,
      //     resource_type: "image",
      //     use_filename: true,
      //     unique_filename: true,
      //     overwrite: false,
      //   },
      //   (error, result) => {
      //     if (error) {
      //       logError("Cloudinary upload error", error);
      //       return fallbackToDisk(req, res, req.file.buffer, originalName);
      //     }

      //     return res.status(200).json({
      //       message: "File uploaded successfully!",
      //       file: {
      //         displayName: originalName,
      //         filename: result.public_id,
      //         url: result.secure_url,
      //       },
      //     });
      //   }
      // );

      // Remove extension for public_id because Cloudinary adds format automatically
      const publicId =
        path.parse(req.file.originalname).name + "-" + Date.now();

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, public_id: publicId },
        (error, result) => {
          if (error) {
            /* fallback ... */
          } else {
            return res.json({
              message: "File uploaded successfully!",
              file: {
                filename: result.public_id,
                displayName: req.file.originalname, // user-friendly
                url: result.secure_url,
              },
            });
          }
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      return;
    }

    // ---- Fallback: Save to disk ----
    if (req.file.buffer) {
      return fallbackToDisk(req, res, req.file.buffer, originalName);
    }

    // ---- If multer used diskStorage ----
    if (req.file.filename) {
      return res.status(200).json({
        message: "File uploaded successfully!",
        file: {
          displayName: originalName,
          filename: req.file.filename,
          url: buildFileUrl(req.file.filename),
        },
      });
    }

    return res.status(500).json({ error: "Unexpected upload error" });
  } catch (err) {
    logError("uploadFile", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ---------- Helper: Disk fallback ----------
function fallbackToDisk(req, res, buffer, originalName) {
  try {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeName = sanitizeFilename(
      `${path.parse(originalName).name}-${uniqueSuffix}${path.extname(
        originalName
      )}`
    );
    const filePath = path.join(UPLOADS_DIR, safeName);

    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        logError("Disk write error", err);
        return res.status(500).json({ error: "Failed to save file" });
      }

      return res.status(200).json({
        message: "File uploaded successfully (local storage fallback)",
        file: {
          displayName: originalName,
          filename: safeName,
          url: buildFileUrl(safeName),
        },
      });
    });
  } catch (err) {
    logError("fallbackToDisk", err);
    return res.status(500).json({ error: "Disk fallback failed" });
  }
}

// ---------- List Files ----------
exports.getFiles = async (req, res) => {
  try {
    if (cloudinaryConfigured) {
      const folder = process.env.CLOUDINARY_FOLDER || "fileuploader";
      cloudinary.api.resources(
        {
          type: "upload",
          prefix: folder,
          max_results: 100,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            logError("Cloudinary list error", error);
            return res
              .status(500)
              .json({ error: "Failed to list uploaded files" });
          }

          const files = (result.resources || []).map((r) => ({
            filename: r.public_id,
            displayName: path.basename(r.public_id),
            url: r.secure_url,
          }));
          // console.log(files);
          return res.status(200).json({ files });
        }
      );
    } else {
      // Fallback: local disk
      fs.readdir(UPLOADS_DIR, (err, files) => {
        if (err) {
          logError("Local list error", err);
          return res.status(500).json({ error: "Failed to read uploads" });
        }

        const imageFiles = files.filter((f) => /\.(jpe?g|png|gif)$/i.test(f));

        const fileList = imageFiles.map((f) => ({
          filename: f,
          displayName: path.basename(f),
          url: buildFileUrl(f),
        }));

        return res.status(200).json({ files: fileList });
      });
    }
  } catch (err) {
    logError("getFiles", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
