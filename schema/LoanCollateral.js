// schema/LoanCollateral.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const loanCollateralSchema = new Schema(
  {
    loanId: {
      type: Schema.Types.ObjectId,
      ref: "Loan",
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: ["VEHICLE", "PHONE"],
      required: true,
    },

    type: {
      type: String,
      enum: ["CAR", "BIKE", "PHONE", "LAPTOP", "OTHER"],
      required: true,
    },
    description: { type: String, trim: true }, // "Uber bike, 2020 Honda..."
    estimatedValue: { type: Number, required: true },

    status: {
      type: String,
      enum: ["PLEDGED", "RELEASED", "IN_DEFAULT", "RECOVERED"],
      default: "PLEDGED",
      index: true,
    },

    seizedAt: { type: Date },
    releasedAt: { type: Date },
  },
  { timestamps: true }
);

export default model("LoanCollateral", loanCollateralSchema);
