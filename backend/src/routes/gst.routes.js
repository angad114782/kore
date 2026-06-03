const router = require("express").Router();
const { verifyGST } = require("../controllers/gst.controller");
const auth = require("../middlewares/auth.middleware");

router.get("/verify/:gstin", auth, verifyGST);

module.exports = router;
