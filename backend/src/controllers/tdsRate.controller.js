const TdsRate = require("../models/TdsRate");
const { ok, created, fail } = require("../utils/apiResponse");

const DEFAULT_RATES = [{ name: "5%", rate: 5 }];

const ensureDefaults = async () => {
  for (const r of DEFAULT_RATES) {
    const exists = await TdsRate.findOne({ rate: r.rate, isDeleted: false });
    if (!exists) await TdsRate.create(r);
  }
};

exports.list = async (req, res) => {
  try {
    await ensureDefaults();
    const items = await TdsRate.find({ isDeleted: false }).sort({ rate: 1 }).lean();
    return ok(res, { data: items });
  } catch (e) {
    return fail(res, { status: 500, message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { rate } = req.body;
    if (rate === undefined || rate === null || isNaN(Number(rate))) {
      return fail(res, { status: 400, message: "rate is required and must be a number" });
    }
    const numeric = Number(rate);
    const name = `${numeric}%`;
    const existing = await TdsRate.findOne({ rate: numeric, isDeleted: false });
    if (existing) return fail(res, { status: 409, message: "Rate already exists" });
    const doc = await TdsRate.create({ name, rate: numeric });
    return created(res, { message: "TDS rate created", data: doc });
  } catch (e) {
    return fail(res, { status: 500, message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const doc = await TdsRate.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) return fail(res, { status: 404, message: "Not found" });
    doc.isDeleted = true;
    await doc.save();
    return ok(res, { message: "TDS rate deleted" });
  } catch (e) {
    return fail(res, { status: 500, message: e.message });
  }
};
