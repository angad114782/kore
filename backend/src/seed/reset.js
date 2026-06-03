const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

(async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing in .env");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Drop every collection
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db.dropCollection(col.name);
      console.log(`🗑  Dropped: ${col.name}`);
    }
    console.log("✅ All collections cleared");

    // Seed superadmin
    const User = require("../models/User");
    const email    = process.env.SUPERADMIN_EMAIL    || "admin@kore.com";
    const password = process.env.SUPERADMIN_PASSWORD || "Admin@12345";
    const hashed   = await bcrypt.hash(password, 10);

    await User.create({ name: "Super Admin", email, password: hashed, role: "superadmin" });
    console.log(`🔥 Superadmin seeded — ${email} / ${password}`);

    process.exit(0);
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exit(1);
  }
})();
