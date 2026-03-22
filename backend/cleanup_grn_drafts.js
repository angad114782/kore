const mongoose = require("mongoose");
const GRNDraft = require("./src/models/grn.model");
require("dotenv").config();

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kore");
    console.log("Connected to MongoDB");

    const result = await GRNDraft.deleteMany({ status: "DRAFT", grnNo: null });
    console.log(`Deleted ${result.deletedCount} drafts with null grnNo`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (err) {
    console.error("Cleanup failed:", err);
  }
}

cleanup();
