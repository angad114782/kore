const mongoose = require("mongoose");

const ReturnItemSchema = new mongoose.Schema(
  {
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterCatalog.variants",
      required: true,
    },
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterCatalog",
      required: true,
    },
    cartonCount: {
      type: Number,
      required: true,
      default: 0,
    },
    pairCount: {
      type: Number,
      required: true,
      default: 0,
    },
    sizeQuantities: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { _id: false }
);

const ReturnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      unique: true,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    orderNumber: String,
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    distributorName: String,
    items: [ReturnItemSchema],
    totalCartons: {
      type: Number,
      default: 0,
    },
    totalPairs: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    reason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Return", ReturnSchema);
