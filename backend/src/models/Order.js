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
    fulfilledSizeQuantities: {
      type: Map,
      of: Number,
      default: {},
    },
    blockedSizeQuantities: {
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
    blockedCartonCount: {
      type: Number,
      default: 0,
    },
    fulfilledCartonCount: {
      type: Number,
      default: 0,
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
    blockedPairCount: {
      type: Number,
      default: 0,
    },
    fulfilledPairCount: {
      type: Number,
      default: 0,
    },
    returnedCartonCount: {
      type: Number,
      default: 0,
    },
    returnedPairCount: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const FulfillmentHistorySchema = new mongoose.Schema({
  batchNumber: Number,
  date: { type: Date, default: Date.now },
  items: [{
    variantId: mongoose.Schema.Types.ObjectId,
    articleId: mongoose.Schema.Types.ObjectId,
    cartonCount: Number,
    returnedCartonCount: { type: Number, default: 0 },
    pairCount: Number,
    returnedPairCount: { type: Number, default: 0 },
    sizeQuantities: { type: Map, of: Number }
  }],
  totalAmount: Number,
  totalCartons: Number,
  totalPairs: Number,
  billUrl: String,
  invoiceUrl: String,
  ewayBillUrl: String,
  transportBillUrl: String,
  receivingNoteUrl: String,
  receiverName: String,
  receiverMobile: String,
}, { _id: true, timestamps: true });

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
      enum: ["BOOKED", "PFD", "RFD", "OFD", "RECEIVED", "PARTIAL"],
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
    fulfillmentHistory: [FulfillmentHistorySchema],
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
