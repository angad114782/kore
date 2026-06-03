const activityLogService = require("../services/activityLog.service");
const { ok, fail } = require("../utils/apiResponse");

exports.list = async (req, res, next) => {
  try {
    const { page, limit, action, entityType, userId, startDate, endDate } = req.query;
    const result = await activityLogService.list({ page, limit, action, entityType, userId, startDate, endDate });
    return ok(res, { data: result.items, meta: result.meta });
  } catch (err) {
    next(err);
  }
};
