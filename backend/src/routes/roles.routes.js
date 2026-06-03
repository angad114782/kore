const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const CustomRole = require("../models/CustomRole");
const User = require("../models/User");

const BASE_ROLES = [
  { name: "admin",       label: "Admin",       base: true },
  { name: "manager",     label: "Manager",     base: true },
  { name: "supervisor",  label: "Supervisor",  base: true },
  { name: "accountant",  label: "Accountant",  base: true },
  { name: "investor",    label: "Investor",    base: true },
  { name: "staff",       label: "Staff",       base: true },
];

router.use(auth);

// GET /api/roles — base + custom roles
router.get("/", role(["superadmin", "admin"]), async (req, res) => {
  try {
    const custom = await CustomRole.find().sort({ createdAt: 1 }).lean();
    const all = [
      ...BASE_ROLES,
      ...custom.map(r => ({ name: r.name, label: r.label, base: false, id: r._id })),
    ];
    res.json({ success: true, data: all });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/roles — create custom role
router.post("/", role(["superadmin"]), async (req, res) => {
  try {
    const { label } = req.body;
    if (!label || !label.trim()) return res.status(400).json({ success: false, message: "Role label required" });
    const name = label.trim().toLowerCase().replace(/\s+/g, "_");
    const exists = BASE_ROLES.find(r => r.name === name) || await CustomRole.findOne({ name });
    if (exists) return res.status(400).json({ success: false, message: "Role already exists" });
    const doc = await CustomRole.create({ name, label: label.trim(), createdBy: req.user?.name });
    res.status(201).json({ success: true, data: { name: doc.name, label: doc.label, base: false, id: doc._id } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/roles/:name — delete custom role (only if no users have it)
router.delete("/:name", role(["superadmin"]), async (req, res) => {
  try {
    const { name } = req.params;
    if (BASE_ROLES.find(r => r.name === name)) return res.status(400).json({ success: false, message: "Base roles cannot be deleted" });
    const inUse = await User.countDocuments({ role: name });
    if (inUse > 0) return res.status(400).json({ success: false, message: `${inUse} user(s) have this role. Reassign first.` });
    await CustomRole.deleteOne({ name });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
