const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Not authorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // tokenVersion check — incrementing it invalidates every JWT issued
    // before the change, including legacy tokens that did not carry a version.
    const user = await User.findById(decoded.id).select("tokenVersion isActive role permissions").lean();
    if (!user) return res.status(401).json({ success: false, message: "User not found" });
    if (!user.isActive) return res.status(403).json({ success: false, message: "Account inactive" });
    if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      return res.status(401).json({ success: false, message: "Session expired. Please login again." });
    }

    // role + permissions come from the database on every request, so a change
    // made by the Super Admin applies immediately without re-login.
    req.user = { ...decoded, role: user.role, permissions: user.permissions || [] };
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};
