// models/SystemSetting.js
// Configurable key-value system settings (e.g. contribution amounts).

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const systemSettingSchema = new Schema(
  {
    // Unique key name for this system setting
    // e.g. "LOAN_MAX_AMOUNT", "CONTRIBUTION_AMOUNT"
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Value stored as string; you can JSON.parse or cast as needed
    value: { type: Schema.Types.Mixed, required: true },

    // Description of what this setting controls
    description: {
      type: String,
      trim: true,
    },

    // Admin (User) who last updated this setting
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export default model("SystemSetting", systemSettingSchema);
