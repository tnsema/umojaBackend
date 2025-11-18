// models/KYCSubmission.js
// Stores documents and status for each KYC submission.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const kycSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    country: {
      type: String,
      trim: true,
      required: true,
    },

    idNo: {
      type: String,
      trim: true,
      required: true,
    },

    documentType: {
      type: String,
      enum: ["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE"],
      required: true,
    },

    front: {
      type: String,
      required: true,
    },

    back: {
      type: String,
    },

    selfie: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default model("Kyc", kycSchema);
