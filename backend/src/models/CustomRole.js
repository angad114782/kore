const mongoose = require("mongoose");

const CustomRoleSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, unique: true, trim: true, lowercase: true },
    label:     { type: String, required: true, trim: true },
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomRole", CustomRoleSchema);
