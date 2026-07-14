const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const Settings = require("../models/Settings");

const ALLOWED_KEYS = ["terms_and_conditions", "disclaimer", "privacy_policy"];
const ADMIN_ONLY_KEYS = ["gstverify_api_key"];

// Public — distributors can read T&C without extra auth (just need login)
router.get("/:key", auth, async (req, res) => {
  try {
    const { key } = req.params;
    if (ADMIN_ONLY_KEYS.includes(key)) {
      const userRole = req.user?.role?.toLowerCase();
      if (!["admin", "superadmin"].includes(userRole))
        return res.status(403).json({ success: false, message: "Forbidden" });
      const doc = await Settings.findOne({ key }).lean();
      const raw = doc?.value || "";
      // Return masked token — frontend only needs to know if it's configured
      const masked = raw.length > 8 ? `${raw.slice(0, 4)}${"*".repeat(raw.length - 8)}${raw.slice(-4)}` : (raw ? "****" : "");
      return res.json({ success: true, data: { key, value: masked, configured: raw.length > 0 } });
    }
    if (!ALLOWED_KEYS.includes(key)) return res.status(400).json({ success: false, message: "Invalid key" });
    const doc = await Settings.findOne({ key }).lean();
    res.json({ success: true, data: { key, value: doc?.value || "" } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Admin only — save/update settings
router.put("/:key", auth, role(["admin", "superadmin"]), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (!ALLOWED_KEYS.includes(key) && !ADMIN_ONLY_KEYS.includes(key))
      return res.status(400).json({ success: false, message: "Invalid key" });
    const doc = await Settings.findOneAndUpdate(
      { key },
      { value: value || "" },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
