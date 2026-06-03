const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const ctrl = require("../controllers/notification.controller");

router.use(auth);

router.get("/config",      role(["superadmin"]),                ctrl.getConfig);
router.put("/config",      role(["superadmin"]),                ctrl.saveConfig);
router.get("/events",      role(["superadmin", "admin"]),       ctrl.getEvents);
router.get("/roles",       role(["superadmin"]),                ctrl.getRoles);
router.post("/test-email", role(["superadmin", "admin"]),       ctrl.testEmail);
router.post("/test-wa",    role(["superadmin"]),                ctrl.testWhatsapp);

module.exports = router;
