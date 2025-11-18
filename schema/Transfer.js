// schema/Transfer.js
// Sender initiates transfer; recipient is always a User (client/member).
// If recipient doesn't exist yet, we create a minimal User first (status=PENDING_KYC).

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const transferSchema = new Schema(
  {
    // Sender (User) initiating the transfer
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Recipient user in the system (client or member).
    // If the person was not in the system, we first create a User for them,
    // usually with status = PENDING_KYC and no password yet.
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Snapshot of recipient full name at the time of transfer.
    // This is stored for audit and display, even if the user later changes their name.
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },

    // Snapshot of recipient phone number at the time of transfer.
    // Also used as a natural identifier to find or create the recipient User.
    recipientPhone: {
      type: String,
      required: true,
      trim: true,
    },

    // Recipient physical address (for agents / records).
    // Optional: may be captured for extra verification or payout documentation.
    recipientAddress: {
      type: String,
      trim: true,
    },

    // Amount to be received by the recipient (in smallest unit, e.g. cents)
    amount: {
      type: Number,
      required: true,
    },

    // System-generated reference used by Umoja (unique transfer code)
    systemRef: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    method: {
      type: String,
      enum: ["WALLET", "POP"],
      default: "WALLET",
    },

    // PENDING_VERIFICATION: awaiting proof / admin check
    // READY_FOR_PAYOUT: cleared and waiting at paying agent
    // PAID_OUT: recipient has received the funds
    // CANCELLED: transfer cancelled or failed
    status: {
      type: String,
      enum: [
        "PENDING_VERIFICATION",
        "READY_FOR_PAYOUT",
        "PAID_OUT",
        "CANCELLED",
      ],
      default: "PENDING_VERIFICATION",
    },

    // Storage key / URL to proof of payment (for deposits),
    // typically uploaded by the sender (bank slip, screenshot, etc.)
    proofOfPaymentDocId: {
      type: String,
    },

    // Admin who verified this transfer (moved it to READY_FOR_PAYOUT)
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Paying Agent (User with PAYING_AGENT role) assigned to this transfer
    payingAgentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

export default model("Transfer", transferSchema);
