// models/LoanGuarantorDecision.js
// Guarantor's approval or rejection of a specific loan.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const loanGuarantorDecisionSchema = new Schema(
  {
    // Loan this decision belongs to
    loanId: {
      type: Schema.Types.ObjectId,
      ref: "Loan",
      required: true,
      index: true,
    },

    // Guarantor (Member) who made this decision
    guarantorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // APPROVE: guarantor accepts the responsibility
    // REJECT: guarantor declines the request
    decision: {
      type: String,
      enum: ["APPROVE", "REJECT"],
      required: true,
    },

    // Optional comment from guarantor explaining their decision
    comment: {
      type: String,
      trim: true,
    },

    // Timestamp when the decision was made
    decidedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default model("LoanGuarantorDecision", loanGuarantorDecisionSchema);
