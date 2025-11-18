// models/ProjectContribution.js
// Tracks contributions of members into projects, including commission.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const projectContributionSchema = new Schema(
  {
    // Project this contribution belongs to
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    // Member (User) who contributed
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    method: {
      type: String,
      enum: ["WALLET", "POP"],
      default: "WALLET",
    },

    // Amount contributed (in smallest unit, e.g. cents)
    amount: {
      type: Number,
      required: true,
    },

    // Wallet transaction that performed this contribution
    walletTxId: {
      type: Schema.Types.ObjectId,
      ref: "WalletTransaction",
      required: true,
    },

    // Commission amount taken by Umoja from this contribution
    commissionAmount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default model("ProjectContribution", projectContributionSchema);
