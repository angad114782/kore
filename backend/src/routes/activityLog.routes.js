const router = require("express").Router();
const controller = require("../controllers/activityLog.controller");
const auth = require("../middlewares/auth.middleware");

router.get("/", auth, controller.list);

module.exports = router;
