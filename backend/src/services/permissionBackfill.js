/**
 * ONE-TIME MIGRATION — not used for access decisions.
 *
 * Access is stored per user in User.permissions and edited from the Users page.
 * This file only upgrades users that were created before:
 *   1. users with no `permissions` at all (role-based era) get a starting set that
 *      matches what their role could do before, so nobody loses access on deploy;
 *   2. users whose keys use the older, coarser scheme (e.g. "orders.manage",
 *      or a bare page such as "vendors" that used to mean "full control") get the
 *      new fine-grained action keys that the old key stood for.
 * Each user is migrated once (marked with permissionsVersion = 2). Safe to re-run.
 */
const User = require("../models/User");
const CustomRole = require("../models/CustomRole");
const { ALL_PERMISSION_KEYS } = require("../config/permissions");

const VERSION = 2;

const USERS = ["users.create", "users.edit", "users.delete", "users.reset_password", "users.roles"];
const ORDERS = ["orders.book", "orders.dispatch", "orders.receive", "orders.edit", "orders.cancel", "orders.delete"];
const CRUD = (p) => [`${p}.create`, `${p}.edit`, `${p}.delete`];

// Old key -> new keys it stood for
const EXPAND = {
  "po.manage": CRUD("po"),
  "orders.manage": ORDERS,
  "returns.manage": ["returns.process"],
  "payments.manage": ["payments.vendor", "payments.distributor"],
  "users.manage": USERS,
  "accounts.view": ["bills.view", "invoices.view", "overdue.view"],
  "reports.view": ["reports.stock", "reports.dispatch", "reports.return"],
  // pages that used to include full control of that area
  grn: ["grn.create"],
  vendors: CRUD("vendors"),
  catalogue: CRUD("catalogue"),
  master_stock: ["stock.inward", "stock.outward"],
  distributors: CRUD("distributors"),
};

const without = (keys) => ALL_PERMISSION_KEYS.filter((k) => !keys.includes(k));

const OPS = ["dashboard", "po.view", "grn", "grn.create", "vendors", ...CRUD("vendors"), "catalogue", ...CRUD("catalogue"),
  "master_stock", "stock.inward", "stock.outward", "distributors", ...CRUD("distributors"), "orders.view", "returns.view", "bills.view", "invoices.view", "overdue.view"];

const LEGACY_DEFAULTS = {
  // Admin could already open the Users list and reset passwords before this change.
  admin: [...without([...USERS, "notifications.manage", "integrations.manage"]), "users.reset_password"],
  manager: OPS,
  supervisor: OPS,
  accountant: ["dashboard", "bills.view", "invoices.view", "overdue.view", "payments.vendor", "payments.distributor", "orders.view", "distributors", "reports.stock", "reports.dispatch", "reports.return"],
};

const expand = (perms) => {
  const out = new Set();
  for (const k of perms) {
    out.add(k);
    (EXPAND[k] || []).forEach((n) => out.add(n));
  }
  return [...out].filter((k) => ALL_PERMISSION_KEYS.includes(k));
};

module.exports = async function backfillPermissions() {
  try {
    // Roles live in the database. Register any role existing users already have.
    const inUse = await User.distinct("role", { role: { $nin: ["superadmin", "distributor"] } });
    for (const name of inUse.filter(Boolean)) {
      const label = name.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      await CustomRole.updateOne({ name }, { $setOnInsert: { name, label, createdBy: "system" } }, { upsert: true });
    }

    const users = await User.find({
      role: { $nin: ["superadmin", "distributor"] },
      permissionsVersion: { $ne: VERSION },
    }).select("role permissions");

    for (const u of users) {
      const next = Array.isArray(u.permissions)
        ? expand(u.permissions)
        : (LEGACY_DEFAULTS[u.role] || ["dashboard"]);
      await User.updateOne({ _id: u._id }, { $set: { permissions: next, permissionsVersion: VERSION } });
    }

    // Users already on scheme 2 may still hold keys that were later split or renamed
    // (e.g. "accounts.view", "reports.view"). Replace only those removed keys.
    const REMOVED = ["po.manage", "orders.manage", "returns.manage", "payments.manage", "users.manage", "accounts.view", "reports.view"];
    const stale = await User.find({ permissionsVersion: VERSION, permissions: { $in: REMOVED } }).select("permissions");
    for (const u of stale) {
      const next = new Set(u.permissions.filter((k) => !REMOVED.includes(k)));
      u.permissions.filter((k) => REMOVED.includes(k)).forEach((k) => (EXPAND[k] || []).forEach((n) => next.add(n)));
      await User.updateOne({ _id: u._id }, { $set: { permissions: [...next].filter((k) => ALL_PERMISSION_KEYS.includes(k)) } });
    }

    if (users.length) console.log(`✅ Permissions migrated for ${users.length} user(s)`);
  } catch (e) {
    console.error("Permission backfill failed:", e.message);
  }
};
