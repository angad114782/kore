const router = require("express").Router();
const ctrl = require("../controllers/purchaseOrderController");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const permission = require("../middlewares/permission.middleware");

const multer = require("multer");
const attach = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 2 } });

router.use(auth);

// Bill routes
router.get("/bills",              permission("bills.view", "po.view"), ctrl.listBills);
router.get("/bills/:id",          permission("bills.view", "po.view"), ctrl.getBillById);
router.patch("/:id/bill/approve", permission("bills.approve"), ctrl.approveBill);
router.patch("/:id/bill/reject",  permission("bills.reject"), ctrl.rejectBill);

// Vendor payable — invoice + payment ledger against an approved bill
router.post("/:id/invoice",         permission("payments.vendor"), ctrl.addInvoice);
router.post("/:id/record-payment",  permission("payments.vendor"), ctrl.recordPayment);

// Email the PO (PDF / CSV generated in the browser)
router.post("/:id/send-email", permission("po.create", "po.edit"),
  attach.fields([{ name: "pdf", maxCount: 1 }, { name: "csv", maxCount: 1 }]), ctrl.emailPO);

// PO routes
router.post("/",    permission("po.create"), ctrl.createPO);
router.get("/",     permission("po.view", "po.create", "po.edit", "po.delete", "bills.view", "grn"), ctrl.listPOs);
router.get("/:id",  permission("po.view", "po.create", "po.edit", "po.delete", "bills.view", "grn"), ctrl.getPOById);
router.put("/:id",  permission("po.edit"), ctrl.updatePO);
router.delete("/:id", permission("po.delete"), ctrl.deletePO);

module.exports = router;
