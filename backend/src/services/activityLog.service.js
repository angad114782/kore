const ActivityLog = require("../models/ActivityLog");
const { getIO } = require("../socket");

/**
 * Create an activity log entry and emit socket event.
 * @param {Object} params
 * @param {string} params.action - enum value
 * @param {string} params.entityType - enum value
 * @param {string} [params.entityId]
 * @param {string} params.description - human-readable
 * @param {Object} [params.metadata]
 * @param {Object} [params.user] - { _id, name, role } from req.user (optional)
 */
const createLog = async ({ action, entityType, entityId = null, description, metadata = {}, user = null }) => {
  try {
    const log = await ActivityLog.create({
      userId: user?._id || user?.id || null,
      userName: user?.name || "System",
      userRole: user?.role || "",
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      description,
      metadata,
    });

    try {
      const io = getIO();
      io.emit("activityLog", {
        _id: log._id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        userName: log.userName,
        userRole: log.userRole,
        createdAt: log.createdAt,
      });
    } catch {
      // socket not ready — ignore
    }

    return log;
  } catch (err) {
    // Never crash the caller if logging fails
    console.error("[ActivityLog] Failed to log:", err.message);
    return null;
  }
};

const list = async ({ page = 1, limit = 50, action, entityType, userId } = {}) => {
  const query = {};
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;
  if (userId) query.userId = userId;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    ActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    ActivityLog.countDocuments(query),
  ]);

  return {
    items,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

module.exports = { createLog, list };
