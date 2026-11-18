const express = require("express");
const router = express.Router();
const grn = require("../controllers/grn.controller");
const auth = require("../middlewares/auth.middleware");
const permission = require("../middlewares/permission.middleware");

router.use(auth);

// References (PO/CAT list)
router.get("/references", grn.listReferences);
router.get("/references/:refId/received-cartons", grn.getReceivedCartons);

// Draft GRN
router.post("/drafts", permission("grn.create"), grn.createDraft);
router.get("/drafts/:draftId", grn.getDraft);

router.post("/drafts/:draftId/scan", permission("grn.create"), grn.scanPair);
router.post("/drafts/:draftId/bulk-scan", permission("grn.create"), grn.bulkScan);
router.post("/drafts/:draftId/rescan-current", permission("grn.create"), grn.rescanCurrent);
router.delete("/drafts/:draftId/cartons/:cartonBarcode", permission("grn.create"), grn.removeCarton);

router.post("/drafts/:draftId/submit", permission("grn.create"), grn.submitDraft);

// History + details
router.get("/history", grn.history);
router.get("/history/export", grn.exportHistory);
router.get("/:grnId", grn.getGRNById);

module.exports = router;