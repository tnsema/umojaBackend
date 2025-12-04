import mongoose from "mongoose";

const { Schema, model } = mongoose;

const contributionSchema = new Schema(
  {
    // Member (User) who made this contribution
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Year of this capital (e.g. 2025)
    // This supports dividend calculations per year
    year: {
      type: Number,
      required: true,
    },

    // Amount contributed for this month (in smallest unit, e.g. cents)
    amount: {
      type: Number,
      required: true,
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

// Prevent duplicate contributions for the same member-month-year
contributionSchema.index({ memberId: 1, year: 1 }, { unique: true });

export default model("Contribution", contributionSchema);
