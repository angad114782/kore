const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const permission = require("../middlewares/permission.middleware");
const ctrl = require("../controllers/notification.controller");

router.use(auth);

router.get("/config",      permission("notifications.manage"), ctrl.getConfig);
router.put("/config",      permission("notifications.manage"), ctrl.saveConfig);
router.get("/events",      permission("notifications.manage"), ctrl.getEvents);
router.get("/roles",       permission("notifications.manage"), ctrl.getRoles);
router.post("/test-email", permission("notifications.manage"), ctrl.testEmail);
router.post("/test-wa",    permission("notifications.manage"), ctrl.testWhatsapp);

module.exports = router;
