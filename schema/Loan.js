// models/Loan.js
// Represents a loan request and its lifecycle.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Repayment entry
const repaymentSchema = new Schema(
  {
    dueDate: { type: Date, required: true },
    principalAmount: { type: Number, required: true },
    interestAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true }, // principal + interest
    method: {
      type: String,
      enum: ["WALLET", "POP"],
      default: "WALLET",
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "LATE"],
      default: "PENDING",
    },
    paidTxId: { type: Schema.Types.ObjectId, ref: "WalletTransaction" },
  },
  { _id: false }
);

// Next-of-kin info
const nextOfKinSchema = new Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relation: { type: String, trim: true },
  },
  { _id: false }
);

// Main Loan Schema
const loanSchema = new Schema(
  {
    borrowerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    guarantorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    purpose: { type: String, trim: true },
    status: {
      type: String,
      enum: [
        "PENDING_ADMIN",
        "PENDING_GUARANTOR",
        "APPROVED",
        "ACTIVE",
        "REJECTED",
        "CLOSED",
        "DEFAULTED",
      ],
      default: "PENDING_GUARANTOR",
    },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    disbursedAt: { type: Date },
    closedAt: { type: Date },
    adminComment: { type: String, trim: true },
    nextOfKin: [nextOfKinSchema],

    // Repayment settings
    repaymentType: {
      type: String,
      enum: ["ONCE_OFF", "MONTHLY"],
      required: true,
    },
    interestRate: { type: Number, default: 0 }, // Annual interest rate percentage
    fees: { type: Number, default: 0 }, // One-time processing fee
    startDate: { type: Date, default: Date.now },
    durationMonths: { type: Number }, // Only relevant for MONTHLY
    repaymentSchedule: [repaymentSchema],
  },
  { timestamps: true }
);

// Generate repayment schedule for monthly loans
loanSchema.methods.generateSchedule = function () {
  if (this.repaymentType === "ONCE_OFF") {
    const interest = (this.amount * this.interestRate) / 100;
    const total = this.amount + interest + this.fees;
    this.repaymentSchedule = [
      {
        dueDate: this.startDate,
        principalAmount: this.amount,
        interestAmount: interest,
        totalAmount: total,
        status: "PENDING",
      },
    ];
  } else if (this.repaymentType === "MONTHLY") {
    const monthlyRate = this.interestRate / 12 / 100;
    const n = this.durationMonths;
    const P = this.amount;
    // Monthly installment calculation (annuity formula)
    const installment =
      (P * (monthlyRate * Math.pow(1 + monthlyRate, n))) /
      (Math.pow(1 + monthlyRate, n) - 1);

    const schedule = [];
    for (let i = 0; i < n; i++) {
      const dueDate = new Date(this.startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      // Interest for the month on remaining principal
      const interestAmount = P * monthlyRate;
      const principalAmount = installment - interestAmount;

      schedule.push({
        dueDate,
        principalAmount,
        interestAmount,
        totalAmount: installment,
        status: "PENDING",
      });

      // Reduce principal for next month's interest calculation
      P -= principalAmount;
    }

    this.repaymentSchedule = schedule;
  }
};

export default model("Loan", loanSchema);
