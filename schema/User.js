// models/User.js
// Base user account; roles are stored in a separate Role collection.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    roles: [
      {
        type: Schema.Types.ObjectId,
        ref: "Role",
        required: true,
      },
    ],

    status: {
      type: String,
      enum: ["PENDING_KYC", "ACTIVE", "SUSPENDED"],
      default: "PENDING_KYC",
    },

    profilePicture: {
      type: String,
    },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "RATHER_NOT_TO_SAY"],
      default: "RATHER_NOT_TO_SAY",
    },
  },
  {
    timestamps: true,
  }
);

export default model("User", userSchema);
