const User = require("../models/User");
const bcrypt = require("bcryptjs");

const ALLOWED_ROLES = ["admin", "staff"]; // 👈 superadmin API se create nahi hoga
const SALT_ROUNDS = 10;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const obj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete obj.password;
  return obj;
};

exports.createUser = async ({ name, email, password, role }) => {
  // ✅ Basic validation (service level safety)
  if (!name || String(name).trim().length < 2) {
    const err = new Error("Name is required (min 2 characters)");
    err.status = 400;
    throw err;
  }

  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !cleanEmail.includes("@")) {
    const err = new Error("Valid email is required");
    err.status = 400;
    throw err;
  }

  if (!password || String(password).length < 6) {
    const err = new Error("Password must be at least 6 characters");
    err.status = 400;
    throw err;
  }

  // ✅ Role safety: superadmin create disabled
  const cleanRole = role ? String(role).toLowerCase().trim() : "staff";
  if (!ALLOWED_ROLES.includes(cleanRole)) {
    const err = new Error(`Invalid role. Allowed: ${ALLOWED_ROLES.join(", ")}`);
    err.status = 400;
    throw err;
  }

  // ✅ Check unique email
  const exists = await User.findOne({ email: cleanEmail }).lean();
  if (exists) {
    const err = new Error("Email already exists");
    err.status = 400;
    throw err;
  }

  // ✅ Hash password
  const hashed = await bcrypt.hash(String(password), SALT_ROUNDS);

  // ✅ Create user
  const user = await User.create({
    name: String(name).trim(),
    email: cleanEmail,
    password: hashed,
    role: cleanRole,
  });

  return sanitizeUser(user);
};

exports.listUsers = async ({
  page = 1,
  limit = 20,
  search = "",
  role = "",
} = {}) => {
  // ✅ Safe pagination
  page = Math.max(parseInt(page, 10) || 1, 1);
  limit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const q = {};
  const cleanSearch = String(search || "").trim();
  if (cleanSearch) {
    q.$or = [
      { name: { $regex: cleanSearch, $options: "i" } },
      { email: { $regex: cleanSearch, $options: "i" } },
    ];
  }

  const cleanRole = String(role || "").trim().toLowerCase();
  if (cleanRole) q.role = cleanRole;

  // ✅ Never list passwords anyway (model select:false already)
  const [items, total] = await Promise.all([
    User.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(q),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

exports.getUserById = async (id) => {
  const user = await User.findById(id).lean();
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return user;
};

exports.updateUserRole = async (id, role) => {
  const cleanRole = String(role || "").trim().toLowerCase();

  // ✅ superadmin role change disabled via API
  if (!ALLOWED_ROLES.includes(cleanRole)) {
    const err = new Error(`Invalid role. Allowed: ${ALLOWED_ROLES.join(", ")}`);
    err.status = 400;
    throw err;
  }

  const user = await User.findByIdAndUpdate(
    id,
    { role: cleanRole },
    { new: true, runValidators: true }
  );

  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  return sanitizeUser(user);
};

exports.deleteUser = async (id) => {
  // ✅ Hard delete (later soft delete can be added)
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return true;
};