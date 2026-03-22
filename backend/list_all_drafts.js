const mongoose = require("mongoose");
const GRNDraft = require("./src/models/grn.model");
require("dotenv").config();

async function listAllDrafts() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/kore";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const drafts = await GRNDraft.find({}).select("grnNo refId status").lean();
    console.log(`Found ${drafts.length} documents in grndrafts:`);
    console.log(JSON.stringify(drafts, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Failed to list drafts:", err);
  }
}

listAllDrafts();
