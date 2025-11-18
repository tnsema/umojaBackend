// models/Role.js
// Defines system roles that can be assigned to users.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const roleSchema = new Schema(
  {
    // Unique role name used in the code (e.g. CLIENT, MEMBER, ADMIN)
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Human-readable label for UI (e.g. "Project Manager")
    label: {
      type: String,
      required: true,
      trim: true,
    },

    // Optional description explaining what this role can do
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

export default model("Role", roleSchema);
