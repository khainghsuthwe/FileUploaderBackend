const express = require("express");
const { uploadFile, getFiles } = require("../controllers/uploadControllers");
const { upload } = require("../middleware/multer");

const router = express.Router();

router.post("/", upload.single("image"), uploadFile);
router.get("/", getFiles);

module.exports = router;
