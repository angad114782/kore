/**
 * permission("orders.view", "dashboard")  → allowed if the user has ANY listed key
 * permission("role:distributor", "orders.manage") → "role:x" matches the account role
 * A superadmin always passes.
 */
module.exports = function permission(...rules) {
  return (req, res, next) => {
    const u = req.user;
    if (!u?.role) return res.status(403).json({ success: false, message: "Forbidden" });
    if (u.role === "superadmin") return next();
    const perms = Array.isArray(u.permissions) ? u.permissions : [];
    const ok = rules.some((r) =>
      r.startsWith("role:") ? u.role === r.slice(5) : perms.includes(r)
    );
    if (!ok) return res.status(403).json({ success: false, message: "Access denied" });
    next();
  };
};
