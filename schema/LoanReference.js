// schema/LoanReference.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const loanReferenceSchema = new Schema(
  {
    loanId: {
      type: Schema.Types.ObjectId,
      ref: "Loan",
      required: true,
      index: true,
    },
    firstMame: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    phone: { type: String, trim: true, required: true },
    relation: { type: String, trim: true, required: true },
  },
  { timestamps: true }
);

export default model("LoanReference", loanReferenceSchema);
