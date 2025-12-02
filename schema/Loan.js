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
    balance: { type: Number, default: 0 }, // decimal(18,2)

    status: {
      type: String,
      enum: [
        "PENDING_ADMIN_REVIEW", // user applied; waiting for admin to review
        "PENDING_GUARANTOR_APPROVAL", // admin approved; waiting for guarantor decision
        "PENDING_BORROWER_CONFIRMATION", // admin + guarantor approved; waiting for borrower to confirm they still want the loan
        "APPROVED_FOR_DISBURSEMENT", // borrower confirmed; waiting for funds to be disbursed
        "ACTIVE", // funds disbursed to borrower (loan is live, repayments in progress)
        "REJECTED", // rejected by admin OR guarantor
        "CANCELLED", // borrower declined / did not confirm / loan cancelled before disbursement
        "CLOSED", // fully repaid according to repayment plan
        "DEFAULTED", // borrower failed to pay, loan in default, collateral can be/has been taken
      ],
      default: "PENDING_ADMIN_REVIEW",
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
