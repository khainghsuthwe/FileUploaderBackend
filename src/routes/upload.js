const express = require("express");
const {
  uploadFile,
  getFiles,
  deleteFile,
} = require("../controllers/uploadControllers");
const { upload } = require("../middleware/multer");

const router = express.Router();

router.post("/", upload.single("image"), uploadFile);
router.get("/", getFiles);
router.delete("/:filename", deleteFile);

module.exports = router;
