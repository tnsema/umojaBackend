// schema/Invoice.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * Generic, minimal invoice / slip / receipt for Umoja.
 * Does NOT know about Loan/Contribution/etc.
 * Only knows: user, amounts, dates, type, reference.
 */
const invoiceSchema = new Schema(
  {
    // Who this invoice belongs to
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Public-facing invoice number / slip number (e.g. INV-2025-00012)
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // General category of invoice (for reporting / filters)
    type: {
      type: String,
      enum: [
        "LOAN_REPAYMENT",
        "LOAN_DISBURSEMENT",
        "LOAN_PENALTY",
        "TRANSFER_FEE",
        "CONTRIBUTION",
        "MEMBERSHIP_FEE",
        "SAVINGS_DEPOSIT",
        "OTHER",
      ],
      required: true,
      index: true,
    },

    // Free-form business reference (loan ref, contribution ref, transfer ref, etc.)
    reference: {
      type: String,
      trim: true,
      index: true,
    },

    // Dates
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },

    // Amounts
    principalAmount: {
      type: Number,
      default: 0,
    },
    interestAmount: {
      type: Number,
      default: 0,
    },
    // total = principal + interest (or any rule you apply before saving)
    totalAmount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "ZAR",
    },

    note: {
      type: String,
      trim: true,
    },

    // Extra structure if needed (installmentNumber, contributionPeriod, etc.)
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

invoiceSchema.methods.recalculateTotal = function () {
  const principal = Number(this.principalAmount || 0);
  const interest = Number(this.interestAmount || 0);
  this.totalAmount = principal + interest;
};

export default model("Invoice", invoiceSchema);
