// schema/WalletTransaction.js
// Immutable log of every wallet movement with strict ENUM types.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const WALLET_TRANSACTION_TYPES = [
  "DEPOSIT", // Credit from real bank deposit
  "WITHDRAWAL", // Debit to real bank withdrawal

  "TRANSFER_OUT", // Sender sending money
  "TRANSFER_IN", // Receiver receiving money

  "CASH_PAYOUT", // Agent gave cash to recipient (reverse of TRANSFER_IN)

  "LOAN_DISBURSEMENT", // Loan principal credited to borrower
  "LOAN_REPAYMENT", // Borrower repaid installment

  "CONTRIBUTION", // Monthly contribution
  "CAPITAL", // Annual capital payment

  "PROJECT_CONTRIB", // Project investment
  "PROJECT_COMMISSION", // Commission taken by Umoja

  "REFUND", // Refund back to member
  "ADJUSTMENT", // Admin manual correction
];

const walletTransactionSchema = new Schema(
  {
    // Wallet this transaction belongs to
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },

    // Strict ENUM of wallet transaction types
    type: {
      type: String,
      enum: WALLET_TRANSACTION_TYPES,
      required: true,
    },

    // Transaction amount (in smallest unit, e.g., cents)
    amount: {
      type: Number,
      required: true,
    },

    // Human-readable or external reference (e.g. bank ref, system ref)
    reference: {
      type: String,
      trim: true,
    },

    // Transaction status
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "REJECTED"],
      default: "PENDING",
    },

    // Storage key / URL to POP (bank slip, screenshot, etc.)
    proofOfPaymentDocId: {
      type: String,
    },

    // User who initiated this transaction
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Admin who verified the action
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Date of verification
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default model("WalletTransaction", walletTransactionSchema);
