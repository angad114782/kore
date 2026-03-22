const mongoose = require("mongoose");
const GRNDraft = require("./src/models/grn.model");
const Counter = require("./src/models/Counter");
require("dotenv").config();

async function migrate() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/kore";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const grns = await GRNDraft.find({ status: "SUBMITTED" }).sort({ submittedAt: 1 });
    console.log(`Found ${grns.length} GRNs to migrate.`);

    const todayYYMMDD = (d) => {
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yy}${mm}${dd}`;
    };

    const makeGRNNo = (articleName, poNo, sequence, date) => {
      const cleanArticle = (articleName || "ITEM").split("-")[0].substring(0, 3).toUpperCase();
      const cleanPO = (poNo || "PO").split("-").pop().slice(-5).toUpperCase();
      const dateStr = todayYYMMDD(date);
      return `GRN-${cleanArticle}-${cleanPO}-${dateStr}-${String(sequence).padStart(3, "0")}`;
    };

    let count = 0;
    for (const grn of grns) {
      count++;
      const oldNo = grn.grnNo;
      const newNo = makeGRNNo(grn.articleName, grn.refId, count, grn.submittedAt || new Date());
      
      console.log(`Migrating: ${oldNo} -> ${newNo}`);
      grn.grnNo = newNo;
      await grn.save();
    }

    // Sync counter
    if (count > 0) {
      await Counter.findOneAndUpdate(
        { id: "grn_no" },
        { seq: count },
        { upsert: true }
      );
      console.log(`Counter 'grn_no' set to ${count}`);
    }

    console.log("Migration complete.");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

migrate();
