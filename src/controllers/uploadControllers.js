const fs = require("fs");
const path = require("path");

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME
);

let cloudinary;
let streamifier;
if (cloudinaryConfigured) {
  cloudinary = require("cloudinary").v2;
  streamifier = require("streamifier");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

exports.uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // If multer kept file in memory and Cloudinary is configured, stream to Cloudinary
  if (req.file.buffer && cloudinaryConfigured) {
    const folder = process.env.CLOUDINARY_FOLDER || "fileuploader";
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          //no cloudinary configured, write to disk as fallback
          console.error("Cloudinary upload error:", error);
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const filename =
            (req.file.fieldname || "file") +
            "-" +
            uniqueSuffix +
            path.extname(req.file.originalname);
          fs.writeFile(
            path.join(UPLOADS_DIR, filename),
            req.file.buffer,
            (err) => {
              if (err)
                return res.status(500).json({ error: "Failed to save file" });
              return res.json({
                message: "File uploaded (fallback to disk)",
                file: {
                  filename,
                  url: `${
                    process.env.BACKEND_URL ||
                    `http://localhost:${process.env.PORT || 5001}`
                  }/uploads/${filename}`,
                },
              });
            }
          );
        } else {
          return res.json({
            message: "File uploaded successfully!",
            file: {
              filename: result.public_id,
              url: result.secure_url,
            },
          });
        }
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    return;
  }

  // If file was stored on disk by multer, return its URL
  if (req.file && req.file.filename) {
    return res.json({
      message: "File uploaded successfully!",
      file: {
        filename: req.file.filename,
        url: `${
          process.env.BACKEND_URL ||
          `http://localhost:${process.env.PORT || 5001}`
        }/uploads/${req.file.filename}`,
      },
    });
  }

  // If file is in memory but Cloudinary not configured: write to disk (fallback)
  if (req.file && req.file.buffer) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename =
      (req.file.fieldname || "file") +
      "-" +
      uniqueSuffix +
      path.extname(req.file.originalname);
    fs.writeFile(path.join(UPLOADS_DIR, filename), req.file.buffer, (err) => {
      if (err) return res.status(500).json({ error: "Failed to save file" });
      return res.json({
        message: "File uploaded successfully (saved to disk)",
        file: {
          filename,
          url: `${
            process.env.BACKEND_URL ||
            `http://localhost:${process.env.PORT || 5001}`
          }/uploads/${filename}`,
        },
      });
    });
    return;
  }

  return res.status(500).json({ error: "Unknown upload error" });
};

exports.getFiles = (req, res) => {
  // If Cloudinary is configured, list recent resources from the configured folder
  if (cloudinaryConfigured) {
    const folder = process.env.CLOUDINARY_FOLDER || "fileuploader";
    cloudinary.api.resources(
      { type: "upload", prefix: folder, max_results: 100 },
      (error, result) => {
        if (error) {
          console.error("Cloudinary list error:", error);
          return res
            .status(500)
            .json({ error: "Failed to list uploaded files" });
        }
        const files = (result.resources || []).map((r) => ({
          filename: r.public_id,
          url: r.secure_url,
        }));
        return res.json({ files });
      }
    );
    return;
  }

  const baseUrl = `${
    process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`
  }/uploads/`;
  fs.readdir(UPLOADS_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: "Failed to read uploads" });

    const imageFiles = files.filter((f) => /\.(jpe?g|png|gif)$/i.test(f));
    const fileList = imageFiles.map((f) => ({
      filename: f,
      url: `${baseUrl}${f}`,
    }));

    res.json({ files: fileList });
  });
};
