const mongoose = require("mongoose");

const SizeQuantitySchema = new mongoose.Schema(
  {
    // The key is the size (e.g. "5"), value is the number of pairs
  },
  { _id: false, strict: false }
);

const OrderItemSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterCatalog",
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    sizeQuantities: {
      type: Map,
      of: Number,
      default: {},
    },
    allocatedSizeQuantities: {
      type: Map,
      of: Number,
      default: {},
    },
    cartonCount: {
      type: Number,
      required: true,
      default: 0,
    },
    allocatedCartonCount: {
      type: Number,
      default: null, // null means not yet allocated
    },
    pairCount: {
      type: Number,
      required: true,
      default: 0,
    },
    allocatedPairCount: {
      type: Number,
      default: null, // null means not yet allocated
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming Distributors are Users
      required: true,
    },
    distributorName: {
      type: String,
      required: true,
    },
    date: {
      type: String, // Storing as formatted string (e.g. "YYYY-MM-DD") for display based on frontend types
      required: true,
    },
    status: {
      type: String,
      enum: ["BOOKED", "PFD", "RFD", "OFD", "RECEIVED"],
      default: "BOOKED",
    },
    billUrl: {
      type: String,
      default: null,
    },
    invoiceUrl: {
      type: String,
      default: null,
    },
    ewayBillUrl: {
      type: String,
      default: null,
    },
    transportBillUrl: {
      type: String,
      default: null,
    },
    receivingNoteUrl: {
      type: String,
      default: null,
    },
    receiverName: {
      type: String,
      default: null,
    },
    receiverMobile: {
      type: String,
      default: null,
    },
    items: [OrderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCartons: {
      type: Number,
      required: true,
      default: 0,
    },
    totalPairs: {
      type: Number,
      required: true,
      default: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Order = mongoose.model("Order", OrderSchema);

module.exports = Order;
