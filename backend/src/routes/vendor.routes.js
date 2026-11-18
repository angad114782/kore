const router = require("express").Router();
const ctrl = require("../controllers/vendorController");
const auth = require("../middlewares/auth.middleware");
const permission = require("../middlewares/permission.middleware");

router.use(auth);

router.post("/", permission("vendors.create"), ctrl.createVendor);
router.get("/", ctrl.getVendorList);
router.get("/:id", ctrl.getVendorById);
router.put("/:id", permission("vendors.edit"), ctrl.updateVendor);

// ✅ active / inactive toggle
router.patch("/:id/toggle-status", permission("vendors.edit"), ctrl.toggleVendorStatus);

router.delete("/:id", permission("vendors.delete"), ctrl.deleteVendor);

module.exports = router;