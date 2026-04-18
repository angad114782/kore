const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/order.controller");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { billUpload } = require("../middlewares/billUpload");

// All order routes require authentication
router.use(auth);

// Distributor routes
router.post("/", role(["distributor"]), OrderController.createOrder);
router.get("/my-orders", role(["distributor"]), OrderController.getDistributorOrders);

// Admin routes
router.get("/", role(["admin", "superadmin"]), OrderController.getAllOrders);

// Status update — admin can set any status, distributor can mark as RECEIVED with bill
router.patch(
  "/:id/status",
  role(["admin", "superadmin", "distributor"]),
  billUpload.single("bill"),
  OrderController.updateOrderStatus
);

router.post(
  "/return",
  role(["admin", "superadmin"]),
  OrderController.processReturn
);

module.exports = router;
