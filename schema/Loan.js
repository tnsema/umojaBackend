// schema/Loan.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const loanSchema = new Schema(
  {
    borrowerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    guarantorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    repaymentPlanId: {
      type: Schema.Types.ObjectId,
      ref: "RepaymentPlan",
      required: true,
    },

    requestedAmount: { type: Number, required: true }, // decimal(18,2)
    totalRepayable: { type: Number, default: 0 }, // decimal(18,2)
    interestRate: { type: Number, default: 0 }, // decimal(5,4) e.g. 12.5
    penaltyFees: { type: Number, default: 0 }, // decimal(18,2)

    status: {
      type: String,
      enum: [
        "PENDING_ADMIN", // admin must approve first before notifying guarantor
        "PENDING_GUARANTOR", // waiting for guarantor approval
        "APPROVED", // approved by guarantor and admin, then borrower is told that they qualify for disbursement
        "ACTIVE", // funds disbursed to borrower
        "REJECTED", // rejected by admin or guarantor
        "CLOSED", // fully repaid
        "DEFAULTED", // loan is in default
      ],
      default: "PENDING_ADMIN",
    },

    loanRequestDate: { type: Date, default: Date.now },
    repaymentDueDate: { type: Date }, // last instalment due date

    isDefaulted: { type: Boolean, default: false },

    purpose: { type: String, trim: true },
    adminComment: { type: String, trim: true },
  },
  { timestamps: true }
);

export default model("Loan", loanSchema);
