// models/MemberProfile.js
// Additional data only for users who are Members in the mutual bank.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const memberProfileSchema = new Schema(
  {
    // Reference to the underlying User document
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Unique membership number assigned by Umoja
    membershipNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Membership status in the mutual structure
    // PENDING: waiting for full activation
    // ACTIVE: member in good standing
    // SUSPENDED: temporarily blocked
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },

    // Date when the user became a member
    joinDate: {
      type: Date,
      default: Date.now,
    },

    // List of years for which this member has paid annual capital
    capitalPaidYears: [
      {
        type: Number, // e.g. 2025, 2026
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default model("MemberProfile", memberProfileSchema);
