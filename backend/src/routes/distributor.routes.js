const router = require("express").Router();
const ctrl = require("../controllers/distributor.controller");
const auth = require("../middlewares/auth.middleware");
const permission = require("../middlewares/permission.middleware");

router.use(auth);

// add auth/role middleware here if needed
router.post("/", permission("distributors.create"), ctrl.createDistributor);
router.get("/", ctrl.listDistributors);
router.get("/:id/summary", ctrl.getDistributorSummary);
router.get("/:id", ctrl.getDistributorById);
router.put("/:id", permission("distributors.edit"), ctrl.updateDistributor);
router.patch("/:id/toggle-status", permission("distributors.edit"), ctrl.toggleDistributorStatus);
router.delete("/:id", permission("distributors.delete"), ctrl.deleteDistributor);

module.exports = router;