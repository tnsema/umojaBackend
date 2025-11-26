// models/KYCSubmission.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const kycSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    idNo: {
      type: String,
      trim: true,
      default: "",
    },

    documentType: {
      type: String,
      enum: ["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "FOREIGN_PERMIT"],
      required: true,
    },

    front: {
      type: String,
      required: true,
    },

    back: {
      type: String,
      default: null,
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
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default model("Kyc", kycSchema);
