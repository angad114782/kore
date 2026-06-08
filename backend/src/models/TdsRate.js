const mongoose = require("mongoose");

const TdsRateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "5%", "2%", "10%"
    rate: { type: Number, required: true },              // numeric value e.g. 5
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TdsRateSchema.index(
  { rate: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

module.exports = mongoose.model("TdsRate", TdsRateSchema);
