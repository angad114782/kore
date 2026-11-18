const router = require("express").Router();
const { upload, compressImages } = require("../middlewares/upload");
const ctrl = require("../controllers/masterCatalogController");
const auth = require("../middlewares/auth.middleware");
const permission = require("../middlewares/permission.middleware");

router.use(auth);

// Stock movement: the permission depends on direction (inward / outward).
const stockDirection = (req, res, next) => {
  const u = req.user;
  if (u.role === "superadmin") return next();
  const own = u.permissions || [];
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [req.body || {}];
  const needs = new Set(rows.map((r) => String(r.type || "").toUpperCase() === "INWARD" ? "stock.inward" : "stock.outward"));
  if ([...needs].every((k) => own.includes(k))) return next();
  return res.status(403).json({ success: false, message: "Access denied" });
};

// ✅ dynamic fields allow:
// images_Red, images_Black, images_White ...
const catalogUpload = upload.any();

const maybeUpload = (req, res, next) => {
  const ct = req.headers["content-type"] || "";
  if (ct.includes("multipart/form-data")) {
    return catalogUpload(req, res, next);
  }
  return next();
};

router.post("/", permission("catalogue.create"), maybeUpload, compressImages, ctrl.createMasterCatalog);
router.get("/", ctrl.getMasterCatalogList);
// Must be registered before /:id so "stock-totals" is not treated as an id
router.get("/stock-totals", ctrl.getStockTotals);
router.get("/booked-map", ctrl.getBookedMap);
// Stock aggregation — also before /:id
router.get("/variants/:variantId/stock", ctrl.getVariantStock);
router.post("/variants/:variantId/reset-stock", permission("stock.outward"), ctrl.resetVariantStock);
router.post("/variants/:variantId/stock-movement", permission("stock.inward", "stock.outward"), stockDirection, ctrl.stockMovement);
router.post("/stock-movement/bulk-by-sku", permission("stock.inward", "stock.outward"), stockDirection, ctrl.bulkStockMovementBySku);
router.post("/image-update/bulk-by-sku", permission("catalogue.edit"), ctrl.bulkImageUpdateBySku);
router.get("/variants/:variantId/available-cartons", ctrl.getAvailableCartons);
router.get("/variants/:variantId/carton-counter", ctrl.getCartonCounter);
router.patch("/variants/:variantId/sku", permission("catalogue.edit"), ctrl.updateVariantSku);

router.get("/:id", ctrl.getMasterCatalogById);
router.put("/:id", permission("catalogue.edit"), maybeUpload, compressImages, ctrl.updateMasterCatalog);

router.patch("/:id/toggle-status", permission("catalogue.edit"), ctrl.toggleMasterCatalogStatus);
router.delete("/:id", permission("catalogue.delete"), ctrl.deleteMasterCatalog);

module.exports = router;