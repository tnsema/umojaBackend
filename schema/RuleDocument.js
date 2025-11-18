// models/RuleDocument.js
// Holds uploaded rules, policies, and governance documents.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ruleDocumentSchema = new Schema(
  {
    // Title of the rule / policy document
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Version string, e.g. "v1.0", "2025-01"
    version: {
      type: String,
      trim: true,
    },

    // Storage key / URL pointing to the file
    fileId: {
      type: String,
      required: true,
    },

    // Date when this document was published to members
    publishedAt: {
      type: Date,
      default: Date.now,
    },

    // User who created / uploaded this rule document
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Whether this version is the currently active one
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default model("RuleDocument", ruleDocumentSchema);
