// models/walletTransaction.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

/*
|--------------------------------------------------------------------------
| ENUMS
|--------------------------------------------------------------------------
*/

export const WalletTransactionTypes = {
  DEPOSIT: "DEPOSIT", // Real-money top up
  WITHDRAWAL: "WITHDRAWAL", // Real bank withdrawal

  TRANSFER_OUT: "TRANSFER_OUT", // P1 sends money
  TRANSFER_IN: "TRANSFER_IN", // P2 receives money
  CASH_PAYOUT: "CASH_PAYOUT", // When agent gives cash to user

  LOAN_DISBURSEMENT: "LOAN_DISBURSEMENT", // Umoja sends loan
  LOAN_REPAYMENT: "LOAN_REPAYMENT", // Borrower repays loan

  CONTRIBUTION: "CONTRIBUTION", // Monthly contribution
  CAPITAL: "CAPITAL", // Annual capital payment

  PROJECT_CONTRIB: "PROJECT_CONTRIB", // Project investment
  PROJECT_COMMISSION: "PROJECT_COMMISSION",

  REFUND: "REFUND",
  ADJUSTMENT: "ADJUSTMENT",
};

export const WalletTransactionDirection = {
  DEBIT: "DEBIT",
  CREDIT: "CREDIT",
};

export const WalletTransactionStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  REJECTED: "REJECTED",
};

/*
|--------------------------------------------------------------------------
| SCHEMA
|--------------------------------------------------------------------------
*/

const walletTransactionSchema = new Schema(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },

    // DEBIT = money leaving wallet
    // CREDIT = money entering wallet
    direction: {
      type: String,
      enum: Object.values(WalletTransactionDirection),
      required: true,
    },

    type: {
      type: String,
      enum: Object.values(WalletTransactionTypes),
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // Ledger tracking
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },

    // Link to higher-level business entity
    relatedType: {
      type: String,
      enum: [
        "DEPOSIT",
        "TRANSFER",
        "LOAN",
        "CONTRIBUTION",
        "PROJECT",
        "PAYOUT",
        "REFUND",
        "ADJUSTMENT",
        "OTHER",
      ],
      default: "OTHER",
    },

    relatedId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    reference: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(WalletTransactionStatus),
      default: WalletTransactionStatus.CONFIRMED,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // flexible metadata object
    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ relatedType: 1, relatedId: 1 });

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

const WalletTransaction = model("WalletTransaction", walletTransactionSchema);
export default WalletTransaction;
