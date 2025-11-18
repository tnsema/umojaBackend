// models/Payout.js
// Actual cash payout to the recipient by a paying agent.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const payoutSchema = new Schema(
  {
    // Paying Agent (User) who processed the payout
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // Whether agent confirmed the recipient is the correct person
    recipientVerified: {
      type: Boolean,
      default: false,
    },

    // PENDING: payout not yet completed
    // COMPLETED: payout done and confirmed
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
      default: "PENDING",
    },

    // Storage key / URL for evidence (e.g., signed slip, ID photo)
    payoutProofDocId: {
      type: String,
    },

    payoutReference: {
      type: String,
    },

    // Timestamp when payout was marked as paid
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default model("Payout", payoutSchema);
