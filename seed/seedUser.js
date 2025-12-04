// seed/seedUser.js
import mongoose from "mongoose";
import config from "../config/config.js";
import Models from "../model/model.js";

const { user: User } = Models;

// --- Seed Data ---
const seedUser = {
  phone: "8888888888",
  email: "willsmith@gmail.com",
  passwordHash: "$2b$10$8uunAxlJatNHOKvcqZzSVui3eli5fr86tSDZPJCe9vZTvTnVkPuW6",
  firstName: "Member",
  lastName: "Smith",
  roles: ["69162e65f0d00f0f2241aa5a"], // <== ROLE ID YOU REQUESTED
  status: "PENDING_KYC",
  gender: "RATHER_NOT_TO_SAY",
};

// --- Seed Function ---
async function runSeed() {
  try {
    console.log("Connecting to DB:", config.mongoURI);
    await mongoose.connect(config.mongoURI);

    // Check if user exists by phone
    const existing = await User.findOne({ phone: seedUser.phone });

    if (existing) {
      console.log("User already exists. Updating if needed...");
      await User.updateOne({ _id: existing._id }, seedUser);
      console.log("✔️ User updated successfully.");
    } else {
      console.log("Creating new user...");
      await User.create(seedUser);
      console.log("✔️ User created successfully.");
    }

    console.log("Seeding complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

runSeed();
