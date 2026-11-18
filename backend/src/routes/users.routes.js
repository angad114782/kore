const router = require("express").Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const permission = require("../middlewares/permission.middleware");

const usersController = require("../controllers/users.controller");

/* --------------------------------------------------
   🔐 PROFILE ROUTES (Any logged-in user)
-------------------------------------------------- */

router.get("/me", auth, usersController.me);
router.patch("/me", auth, usersController.updateMe);
router.patch("/me/password", auth, usersController.changePassword);
router.post("/me/logout-all", auth, usersController.logoutAllSessions);

/* --------------------------------------------------
   👑 ADMIN MANAGEMENT ROUTES
-------------------------------------------------- */

// Only Superadmin can create users
router.post("/", auth, permission("users.create"), usersController.createUser);

// Superadmin/Admin can view users
router.get("/", auth, permission("users.create", "users.edit", "users.delete", "users.reset_password", "users.roles", "notifications.manage"), usersController.listUsers);

// Superadmin can update user
router.patch(
  "/:id",
  auth,
  permission("users.edit"),
  usersController.updateUser
);

// Superadmin can delete user
router.delete(
  "/:id",
  auth,
  permission("users.delete"),
  usersController.deleteUser
);

// Admin/Superadmin reset password → auto-logout target user
router.patch(
  "/:id/reset-password",
  auth,
  permission("users.reset_password"),
  usersController.adminResetPassword
);

module.exports = router;
