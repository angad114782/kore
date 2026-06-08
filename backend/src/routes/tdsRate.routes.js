const router = require("express").Router();
const ctrl = require("../controllers/tdsRate.controller");
const auth = require("../middlewares/auth.middleware");

router.get("/", auth, ctrl.list);
router.post("/", auth, ctrl.create);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
