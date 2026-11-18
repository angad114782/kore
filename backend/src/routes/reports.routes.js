const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const permission = require("../middlewares/permission.middleware");
const { getStockReport, getDispatchReport, getReturnReport } = require("../controllers/reports.controller");

router.use(auth);
router.get("/stock",    permission("reports.stock"),    getStockReport);
router.get("/dispatch", permission("reports.dispatch"), getDispatchReport);
router.get("/return",   permission("reports.return"),   getReturnReport);

module.exports = router;
