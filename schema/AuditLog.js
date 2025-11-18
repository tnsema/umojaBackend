// models/AuditLog.js
// Generic audit trail of important actions.

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const auditLogSchema = new Schema(
  {
    // User who performed the action (optional for system actions)
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Short code or name for the action
    // e.g. "USER_REGISTER", "LOAN_APPROVE", "KYC_REJECT"
    action: {
      type: String,
      required: true,
      trim: true,
    },

    // Type of entity affected (model name or logical type)
    // e.g. "User", "Loan", "Wallet", "Transfer"
    entityType: {
      type: String,
      trim: true,
    },

    // ID of the entity affected (if any)
    entityId: {
      type: Schema.Types.ObjectId,
    },

    // Optional JSON payload describing what changed or context
    payload: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export default model("AuditLog", auditLogSchema);
