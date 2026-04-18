const path = require("path");

// 👇 Force dotenv to load root .env file
require("dotenv").config({
  path: path.join(__dirname, "../../.env"),
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

(async () => {
  try {
    // ✅ Check env loaded
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not found in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB Connected for seeding");

    // 1️⃣ Seed Super Admin
    const superEmail = process.env.SUPERADMIN_EMAIL;
    const superPassword = process.env.SUPERADMIN_PASSWORD;

    if (!superEmail || !superPassword) {
      throw new Error("SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD missing in .env");
    }

    const superExists = await User.findOne({ email: superEmail });
    if (!superExists) {
      const hashed = await bcrypt.hash(superPassword, 10);
      await User.create({
        name: "Super Admin",
        email: superEmail,
        password: hashed,
        role: "superadmin",
      });
      console.log("🔥 Super Admin seeded successfully:", superEmail);
    } else {
      console.log("✅ Super Admin already exists:", superEmail);
    }

    // 2️⃣ Seed Admin
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const adminExists = await User.findOne({ email: adminEmail });
      if (!adminExists) {
        const hashedAdmin = await bcrypt.hash(adminPassword, 10);
        await User.create({
          name: "Admin",
          email: adminEmail,
          password: hashedAdmin,
          role: "admin",
        });
        console.log("🔥 Admin seeded successfully:", adminEmail);
      } else {
        console.log("✅ Admin already exists:", adminEmail);
      }
    }

    process.exit(0);
  } catch (e) {
    console.error("❌ Seed error:", e.message);
    process.exit(1);
  }
})();