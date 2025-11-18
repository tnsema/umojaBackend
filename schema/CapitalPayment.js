// models/CapitalPayment.js
// Annual capital payment (separate from monthly contributions).

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const capitalPaymentSchema = new Schema(
  {
    // Member (User) who paid the capital
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Year this capital payment applies to (e.g. 2025)
    year: {
      type: Number,
      required: true,
    },

    // Amount paid as capital (in smallest unit, e.g. cents)
    amount: {
      type: Number,
      required: true,
    },

    // PENDING: awaiting confirmation
    // PAID: confirmed
    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },

    // Wallet transaction that represents this payment
    walletTxId: {
      type: Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },
  },
  {
    timestamps: true,
  }
);

export default model("CapitalPayment", capitalPaymentSchema);
