// schema/RepaymentPlan.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const repaymentPlanSchema = new Schema(
  {
    code: {
      type: String,
      enum: ["ONE_MONTH", "TWO_MONTHS", "THREE_MONTHS"],
      required: true,
      unique: true,
    },
    label: { type: String, required: true, trim: true }, // "1 month", etc.
    numberOfMonths: { type: Number, required: true, enum: [1, 2, 3] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model("RepaymentPlan", repaymentPlanSchema);
