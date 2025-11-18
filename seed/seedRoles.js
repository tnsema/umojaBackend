// seed/seedRoles.js
// Seed default roles for Umoja

import mongoose from "mongoose";
import Models from "../model/model.js";
import config from "../config/config.js";

const { role: Role } = Models;

// List of roles to seed
const rolesToSeed = [
  {
    name: "CLIENT",
    label: "Client",
    description: "Basic user who can receive funds or later register fully",
  },
  {
    name: "MEMBER",
    label: "Member",
    description: "Cooperative member with voting and investment rights",
  },
  {
    name: "PROJECT_MANAGER",
    label: "Project Manager",
    description: "Manages cooperative investment projects",
  },
  {
    name: "ADMIN",
    label: "Administrator",
    description: "Full backend administrative access",
  },
  {
    name: "PAYING_AGENT",
    label: "Paying Agent",
    description: "Handles payouts to recipients",
  },
];

async function seedRoles() {
  try {
    await mongoose.connect(config.mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    console.log("Connected to DB");

    for (const role of rolesToSeed) {
      const exists = await Role.findOne({ name: role.name });

      if (!exists) {
        await Role.create(role);
        console.log(`✓ Created role: ${role.name}`);
      } else {
        console.log(`• Role already exists: ${role.name}`);
      }
    }

    console.log("\nRole seeding complete!\n");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding roles:", err);
    process.exit(1);
  }
}

seedRoles();
