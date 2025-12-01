// schema/LoanRepayment.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * Middle entity between Loan and Invoice.
 * One document = one scheduled repayment (installment).
 */
const loanRepaymentSchema = new Schema(
  {
    loanId: {
      type: Schema.Types.ObjectId,
      ref: "Loan",
      required: true,
      index: true,
    },

    // current installment number (1, 2, 3, ...)
    installmentNumber: {
      type: Number,
      required: true,
    },

    // total installments for this loan (e.g. 3 for 3-month plan)
    totalInstallments: {
      type: Number,
      required: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    // Base amounts
    principalAmount: {
      type: Number,
      default: 0,
    },
    interestAmount: {
      type: Number,
      default: 0,
    },

    // Extra charges when late
    lateFeeAmount: {
      type: Number,
      default: 0,
    },

    // principal + interest + lateFee
    totalAmount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID", "LATE", "DEFAULTED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },

    paidAt: {
      type: Date,
    },

    paymentTxId: {
      type: Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },

    // All invoices ever generated for this installment
    invoiceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Invoice",
      },
    ],

    // The latest / active invoice for this installment
    lastInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
    },

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

loanRepaymentSchema.methods.recalculateTotal = function () {
  const principal = Number(this.principalAmount || 0);
  const interest = Number(this.interestAmount || 0);
  const lateFee = Number(this.lateFeeAmount || 0);
  this.totalAmount = principal + interest + lateFee;
};

export default model("LoanRepayment", loanRepaymentSchema);
