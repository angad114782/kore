const path = require("path");
const fs = require("fs");
const multer = require("multer");

const billDir = "uploads/bills";
if (!fs.existsSync(billDir)) {
  fs.mkdirSync(billDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, billDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf",
  ].includes(file.mimetype);
  cb(ok ? null : new Error("Only image or PDF files allowed"), ok);
};

const billUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = { billUpload };
