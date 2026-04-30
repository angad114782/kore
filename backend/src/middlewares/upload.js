const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp");

const uploadDir = "uploads/catalog";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Use memory storage so we can process images with sharp before writing to disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.mimetype);
  cb(ok ? null : new Error("Only image files allowed"), ok);
};

const upload = multer({
  storage,
  fileFilter,
});

/**
 * Middleware: compressImages
 * Runs AFTER multer (memoryStorage). For every uploaded image file:
 *   1. Resize to max 1200px width (maintain aspect ratio)
 *   2. Convert to WebP at quality 80
 *   3. Write the compressed .webp file to uploads/catalog/
 *   4. Update file.path / file.filename so downstream code works unchanged
 */
const compressImages = async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || (Array.isArray(files) && files.length === 0)) {
      return next();
    }

    const fileList = Array.isArray(files) ? files : Object.values(files).flat();

    await Promise.all(
      fileList.map(async (file) => {
        // Only process image files
        if (!file.mimetype || !file.mimetype.startsWith("image/")) return;

        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
        const webpFilename = `${Date.now()}-${base}.webp`;
        const outputPath = path.join(uploadDir, webpFilename);

        // Compress & convert to WebP
        await sharp(file.buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(outputPath);

        // Update file metadata so downstream service code works unchanged
        file.path = outputPath;
        file.filename = webpFilename;
        file.mimetype = "image/webp";
        file.size = fs.statSync(outputPath).size;

        // Free the buffer from memory
        delete file.buffer;
      })
    );

    next();
  } catch (err) {
    console.error("Image compression error:", err);
    next(err);
  }
};

module.exports = { upload, compressImages };