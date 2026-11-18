const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const permission = require("../middlewares/permission.middleware");
const CustomRole = require("../models/CustomRole");
const User = require("../models/User");
const { PERMISSION_CATALOG } = require("../config/permissions");


router.use(auth);

// GET /api/roles/permissions — every permission that can be assigned to a user
router.get("/permissions", permission("users.create", "users.edit", "users.delete", "users.reset_password", "users.roles"), (req, res) => {
  res.json({ success: true, data: PERMISSION_CATALOG });
});

// GET /api/roles — base + custom roles
router.get("/", permission("users.create", "users.edit", "users.delete", "users.reset_password", "users.roles"), async (req, res) => {
  try {
    const custom = await CustomRole.find().sort({ createdAt: 1 }).lean();
    // Every role comes from the database — none are built in.
    const all = custom.map(r => ({ name: r.name, label: r.label, base: false, id: r._id }));
    res.json({ success: true, data: all });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/roles — create custom role
router.post("/", permission("users.roles"), async (req, res) => {
  try {
    const { label } = req.body;
    if (!label || !label.trim()) return res.status(400).json({ success: false, message: "Role label required" });
    const name = label.trim().toLowerCase().replace(/\s+/g, "_");
    if (name.replace(/[_-]+/g, "") === "superadmin") return res.status(400).json({ success: false, message: "This role name is reserved" });
    const exists = await CustomRole.findOne({ name });
    if (exists) return res.status(400).json({ success: false, message: "Role already exists" });
    const doc = await CustomRole.create({ name, label: label.trim(), createdBy: req.user?.name });
    res.status(201).json({ success: true, data: { name: doc.name, label: doc.label, base: false, id: doc._id } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/roles/:name — delete custom role (only if no users have it)
router.delete("/:name", permission("users.roles"), async (req, res) => {
  try {
    const { name } = req.params;
    if (name === "superadmin" || name === "distributor") return res.status(400).json({ success: false, message: "This role cannot be deleted" });
    const inUse = await User.countDocuments({ role: name });
    if (inUse > 0) return res.status(400).json({ success: false, message: `${inUse} user(s) have this role. Reassign first.` });
    await CustomRole.deleteOne({ name });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
