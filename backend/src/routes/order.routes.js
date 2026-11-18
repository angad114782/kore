const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/order.controller");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const permission = require("../middlewares/permission.middleware");
const { billUpload } = require("../middlewares/billUpload");

const ORDER_ACTIONS = ["orders.book", "orders.dispatch", "orders.receive", "orders.edit", "orders.cancel", "orders.delete"];
const ORDER_VIEW = ["orders.view", "dashboard", "invoices.view", "overdue.view", "reports.stock", "reports.dispatch", "reports.return", ...ORDER_ACTIONS];

// A status change needs the permission for what it actually does — so a user can be
// allowed to book orders but not cancel them. Distributors and superadmin pass.
const STATUS_PERMISSION = {
  PENDING: "orders.book",
  PRE_BOOKED: "orders.book",
  CONFIRMED: "orders.book",
  BOOKED: "orders.book",
  PFD: "orders.dispatch",
  RFD: "orders.dispatch",
  OFD: "orders.dispatch",
  RECEIVED: "orders.receive",
  PARTIAL: "orders.receive",
  CANCELLED: "orders.cancel",
};
const statusPermission = (req, res, next) => {
  const u = req.user;
  if (u.role === "superadmin" || u.role === "distributor") return next();
  const needed = STATUS_PERMISSION[String(req.body?.status || "").toUpperCase()] || "orders.dispatch";
  if ((u.permissions || []).includes(needed)) return next();
  return res.status(403).json({ success: false, message: "Access denied" });
};

// All order routes require authentication
router.use(auth);

// Distributor routes
router.post("/", permission("role:distributor"), OrderController.createOrder);
router.get("/my-orders", permission("role:distributor"), OrderController.getDistributorOrders);

// Admin routes
router.get("/stats", permission(...ORDER_VIEW, "returns.view", "returns.process"), OrderController.getOrderStatsCtrl);
router.get("/dashboard-metrics", permission(...ORDER_VIEW, "returns.view", "returns.process"), OrderController.getDashboardMetricsCtrl);
router.get("/item-summary", permission(...ORDER_VIEW, "returns.view", "returns.process"), OrderController.getItemOrderSummaryCtrl);
router.get("/", permission(...ORDER_VIEW, "returns.view", "returns.process"), OrderController.getAllOrders);
// Safe legacy-order repair: dry-run unless the caller explicitly sends { apply: true }.
// Must stay above the generic "/:id" route.
router.post(
  "/maintenance/backfill-product-snapshots",
  permission("orders.edit"),
  OrderController.backfillLegacyProductSnapshots
);

// Status update — admin can set any status, distributor can mark as RECEIVED with bill
router.patch(
  "/:id/status",
  permission("role:distributor", ...ORDER_ACTIONS),
  billUpload.fields([
    { name: "invoice", maxCount: 1 },
    { name: "ewayBill", maxCount: 1 },
    { name: "transportBill", maxCount: 1 },
    { name: "receivingNote", maxCount: 1 },
    { name: "bill", maxCount: 1 }, // backward compatibility
  ]),
  statusPermission,
  OrderController.updateOrderStatus
);

// Per-carton dispatch lifecycle — Scan / Transport / Receive tabs.
// Registered before the generic "/:id" route below.
router.post(
  "/:id/scan",
  permission("role:distributor", "orders.dispatch"),
  OrderController.scanCarton
);
router.post(
  "/:id/transit",
  permission("role:distributor", "orders.dispatch"),
  billUpload.fields([
    { name: "invoice", maxCount: 1 },
    { name: "ewayBill", maxCount: 1 },
    { name: "transportBill", maxCount: 1 },
  ]),
  OrderController.submitTransit
);
router.post(
  "/:id/receive",
  permission("role:distributor", "orders.receive"),
  billUpload.fields([{ name: "receivingNote", maxCount: 1 }]),
  OrderController.receiveCartons
);

router.post(
  "/return",
  permission("returns.process"),
  OrderController.processReturn
);

router.get(
  "/returns",
  permission("returns.view", "returns.process"),
  OrderController.getReturnHistory
);

// Payment
router.get("/overdue", permission("role:distributor", "overdue.view", "payments.distributor"), OrderController.getOverdueOrders);
router.post("/:id/record-payment", permission("payments.distributor"), OrderController.recordPayment);

// Single order fetch (admin sees any, distributor sees own only)
router.get("/:id", permission("role:distributor", ...ORDER_VIEW, "returns.view", "returns.process"), OrderController.getOrderByIdCtrl);

// Edit / Delete (distributor own orders, or admin)
router.patch("/:id/edit", permission("role:distributor", "orders.edit"), OrderController.editOrderCtrl);
router.delete("/:id", permission("role:distributor", "orders.delete"), OrderController.deleteOrderCtrl);

module.exports = router;
