// models/Loan.js
// Represents a loan request and its lifecycle.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const MainAccountSchema = new Schema(
  {
    // Bank account details
    bankaccount: {
      type: String,
      trim: true,
    },

    balance: {
      type: Number,
      required: true,
      default: 0,
    },

    bankname: {
      type: String,
      trim: true,
    },

    branchcode: {
      type: String,
      trim: true,
    },

    // Balance in the account known to umoja
    balance: {
      type: Number,
      required: true,
    },

    // Current state of the loan
    // PENDING_GUARANTOR, PENDING_ADMIN, APPROVED, ACTIVE, REJECTED, CLOSED, DEFAULTED

    // Timestamp when borrower submitted this loan request
    requestedAt: {
      type: Date,
      default: Date.now,
    },

    // Timestamp when admin approved the loan
    approvedAt: {
      type: Date,
    },

    // Timestamp when funds were disbursed to wallet
    disbursedAt: {
      type: Date,
    },

    // Timestamp when loan was closed (fully repaid or written off)
    closedAt: {
      type: Date,
    },

    // Admin notes regarding this loan decision
    adminComment: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default model("MainAccount", MainAccountSchema);
