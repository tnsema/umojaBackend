// models/capital.model.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const capitalSchema = new Schema(
  {
    // Member (User) who made this capital payment
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Year of this capital (e.g. 2025)
    year: {
      type: Number,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    reference: {
      type: String,
      required: true,
      unique: true,
    },

    // PENDING: created but not verified
    // PAID: fully verified and counted in year-end profits
    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  }
);

// one capital record per member per year
capitalSchema.index({ memberId: 1, year: 1 }, { unique: true });

export default model("Capital", capitalSchema);
