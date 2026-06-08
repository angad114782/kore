const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const mongoose = require("mongoose");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB:", process.env.MONGO_URI.split("@")[1]);

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log("ℹ️  No collections found — DB already clean.");
    } else {
      for (const col of collections) {
        await db.collection(col.name).drop();
        console.log(`🗑️  Dropped: ${col.name}`);
      }
      console.log(`\n✅ Done — ${collections.length} collections dropped.`);
    }

    process.exit(0);
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exit(1);
  }
})();
