const mongoose = require("mongoose");
const grnService = require("./src/services/grn.service");
const Counter = require("./src/models/Counter");
require("dotenv").config();

async function testUniqueness() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kore");
    console.log("Connected to MongoDB");

    // Clear grn_no counter for clean test if you want, but better to just see it increment
    
    const results = await Promise.all([
      grnService.listReferences("ARM"),
      grnService.listReferences("ARM"),
      grnService.listReferences("ARM"),
    ]);

    // This is not quite a concurrency test for submitDraft because submitDraft is async and depends on Mongoose models
    // But we can test the getNextSequence helper directly
    
    const sequences = await Promise.all([
      grnService.getNextSequence("grn_no_test"),
      grnService.getNextSequence("grn_no_test"),
      grnService.getNextSequence("grn_no_test"),
      grnService.getNextSequence("grn_no_test"),
      grnService.getNextSequence("grn_no_test"),
    ]);

    console.log("Generated sequences:", sequences);
    const unique = new Set(sequences).size === sequences.length;
    console.log("Are all unique?", unique);

    await Counter.deleteOne({ id: "grn_no_test" });
    await mongoose.disconnect();
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testUniqueness();
