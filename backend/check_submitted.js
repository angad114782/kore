const mongoose = require("mongoose");
const GRNDraft = require("./src/models/grn.model");
require("dotenv").config();

async function checkSubmitted() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/kore";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const count = await GRNDraft.countDocuments({ status: "SUBMITTED" });
    console.log(`Submitted GRNs: ${count}`);

    if (count > 0) {
      const grns = await GRNDraft.find({ status: "SUBMITTED" }).select("grnNo").lean();
      console.log(JSON.stringify(grns, null, 2));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Failed:", err);
  }
}

checkSubmitted();
