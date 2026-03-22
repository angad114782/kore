const mongoose = require("mongoose");
const GRNDraft = require("./src/models/grn.model");
require("dotenv").config();

async function listCurrentGRNs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kore");
    console.log("Connected to MongoDB");

    const grns = await GRNDraft.find({ status: "SUBMITTED" }).select("grnNo refId articleName submittedAt").lean();
    console.log(`Found ${grns.length} submitted GRNs:`);
    console.log(JSON.stringify(grns, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Failed to list GRNs:", err);
  }
}

listCurrentGRNs();
