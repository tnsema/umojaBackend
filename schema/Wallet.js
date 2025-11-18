// models/Wallet.js
// On-platform wallet for a user, holding their balance.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const walletSchema = new Schema(
  {
    // Owner of this wallet (User)
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Current balance of the wallet (store in smallest unit, e.g. cents)
    balance: {
      type: Number,
      required: true,
      default: 0,
    },

    // Currency code (e.g. ZAR)
    currency: {
      type: String,
      required: true,
      default: "ZAR",
    },
  },
  {
    timestamps: true,
  }
);

export default model("Wallet", walletSchema);
