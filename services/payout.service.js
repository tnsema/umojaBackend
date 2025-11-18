// services/payout.service.js
// Business logic for cash payouts by agents.

import Models from "../model/model.js";
import mongoose from "mongoose";

const { payout: Payout, transfer: Transfer, user: User } = Models;

const { isValidObjectId } = mongoose;

/**
 * createPayout({ transferId, agentId, proofDocId })
 *
 * - Validates transfer & agent exist
 * - Ensures no existing payout for this transfer
 * - Creates payout with status PENDING
 * - Optionally updates Transfer.status to READY_FOR_PAYOUT
 */
export async function createPayoutService({ transferId, agentId, proofDocId }) {
  if (!transferId || !agentId) {
    const err = new Error("transferId and agentId are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(transferId) || !isValidObjectId(agentId)) {
    const err = new Error("Invalid transferId or agentId");
    err.code = "INVALID_ID";
    throw err;
  }

  const transfer = await Transfer.findById(transferId);
  if (!transfer) {
    const err = new Error("Transfer not found");
    err.code = "TRANSFER_NOT_FOUND";
    throw err;
  }

  const agent = await User.findById(agentId);
  if (!agent) {
    const err = new Error("Paying agent not found");
    err.code = "AGENT_NOT_FOUND";
    throw err;
  }

  // Ensure no duplicate payout for this transfer
  const existing = await Payout.findOne({ transferId });
  if (existing) {
    const err = new Error("Payout already exists for this transfer");
    err.code = "DUPLICATE_PAYOUT";
    throw err;
  }

  // Generate a payout reference if needed
  const payoutReference =
    transfer.systemRef ||
    `PAYOUT-${transfer._id.toString().slice(-6)}-${Date.now().toString(36)}`;

  const payout = await Payout.create({
    transferId: transfer._id, // <-- make sure schema has this
    agentId: agent._id,
    recipientVerified: false,
    status: "PENDING",
    payoutProofDocId: proofDocId || undefined,
    payoutReference,
    paidAt: null,
  });

  // Link agent and status on Transfer side if you want
  transfer.payingAgentId = agent._id;
  if (transfer.status === "PENDING_VERIFICATION") {
    transfer.status = "READY_FOR_PAYOUT";
  }
  await transfer.save();

  return { payout, transfer };
}

/**
 * updatePayoutStatus({ payoutId, status })
 *
 * status: "PENDING" | "COMPLETED"
 * - COMPLETED → recipientVerified = true, paidAt = now
 * - Also updates Transfer.status to PAID_OUT when COMPLETED
 */
export async function updatePayoutStatusService({ payoutId, status }) {
  if (!payoutId || !status) {
    const err = new Error("payoutId and status are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(payoutId)) {
    const err = new Error("Invalid payoutId");
    err.code = "INVALID_PAYOUT_ID";
    throw err;
  }

  const normalizedStatus = String(status).trim().toUpperCase();
  if (!["PENDING", "COMPLETED"].includes(normalizedStatus)) {
    const err = new Error("Invalid payout status");
    err.code = "INVALID_STATUS";
    throw err;
  }

  const payout = await Payout.findById(payoutId);
  if (!payout) {
    const err = new Error("Payout not found");
    err.code = "PAYOUT_NOT_FOUND";
    throw err;
  }

  payout.status = normalizedStatus;

  if (normalizedStatus === "COMPLETED") {
    payout.recipientVerified = true;
    payout.paidAt = new Date();
  } else {
    // Reset paidAt if we go back to PENDING
    payout.recipientVerified = false;
    payout.paidAt = null;
  }

  await payout.save();

  // Update related transfer if we have transferId
  if (payout.transferId) {
    const transfer = await Transfer.findById(payout.transferId);
    if (transfer) {
      if (normalizedStatus === "COMPLETED") {
        transfer.status = "PAID_OUT";
      } else if (transfer.status === "PAID_OUT") {
        // If we roll back payout to PENDING, put transfer back to READY_FOR_PAYOUT
        transfer.status = "READY_FOR_PAYOUT";
      }
      await transfer.save();
    }
  }

  return payout;
}

/**
 * verifyPayout(ref)
 *
 * - ref is typically payoutReference
 * - Returns payout + status; used by agent or recipient to verify.
 */
export async function verifyPayoutService(ref) {
  if (!ref) {
    const err = new Error("Reference is required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  const payout = await Payout.findOne({ payoutReference: ref })
    .populate("agentId", "firstName lastName phone email")
    .lean();

  if (!payout) {
    const err = new Error("Payout not found for this reference");
    err.code = "PAYOUT_NOT_FOUND";
    throw err;
  }

  return payout;
}
