// models/Project.js
// Investment project managed within the Umoja structure.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const projectSchema = new Schema(
  {
    // Project name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Description of the project
    description: {
      type: String,
      trim: true,
    },

    // Member (User) who originally requested this project
    requestedByMemberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Project Manager (Member) responsible for this project
    projectManagerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Commission rate applied to contributions (e.g. 0.05 for 5%)
    commissionRate: {
      type: Number,
      required: true,
      default: 0.05,
    },

    balance: {
      type: Number,
      required: true,
      default: 0,
    },

    // PENDING_APPROVAL: proposed but not yet approved
    // ACTIVE: running project
    // ARCHIVED: completed / closed project
    status: {
      type: String,
      enum: ["PENDING_APPROVAL", "ACTIVE", "ARCHIVED", "TERMINATED"],
      default: "ACTIVE",
    },

    // Date when project was approved
    approvedAt: {
      type: Date,
    },

    // Admin (User) who approved the project
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export default model("Project", projectSchema);
