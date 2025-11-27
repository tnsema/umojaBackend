// services/transfer.service.js
// Business logic for money transfers in Umoja.

import Models from "../model/model.js";
import mongoose from "mongoose";

const { transfer: Transfer, user: User } = Models;
const { isValidObjectId } = mongoose;

// Helper: generate unique reference
/*
function generateTransferReference() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";

  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `TR${randomPart}`;
}
*/
function generateTransferReference() {
  const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
  return `TR${randomDigits}`;
}

// Helper: normalize status
function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toUpperCase();
}

const ALLOWED_STATUSES = [
  "CREATED", // initial status
  "SUBMITTED", // after submission of proof of payment
  "DECLINED", // when admin declines the transfer
  "APPROVED", // when admin approves the transfer
  "PAID", // when transfer is marked as paid,
  "FAILED", // when transfer fails
  "CANCELLED", // when user/admin cancels the transfer
];

/**
 * createTransferService({
 *   senderId,
 *   receiverPhone,
 *   amount,
 *   description?
 * })
 *
 * - senderId: from JWT (req.payload.userId)
 * - receiverPhone: phone used to look up receiver User
 * - amount: positive number
 * - status: PENDING by default
 */
export async function createTransferService({
  senderId,
  receiverPhone,
  amount,
  description,
}) {
  if (!senderId || !receiverPhone || !amount) {
    const err = new Error("senderId, receiverPhone and amount are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(senderId)) {
    const err = new Error("Invalid senderId");
    err.code = "INVALID_USER_ID";
    throw err;
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    const err = new Error("Invalid transfer amount");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  const sender = await User.findById(senderId);
  if (!sender) {
    const err = new Error("Sender not found");
    err.code = "SENDER_NOT_FOUND";
    throw err;
  }

  const receiver = await User.findOne({ phone: receiverPhone.trim() });
  if (!receiver) {
    const err = new Error("Receiver not found with provided phone");
    err.code = "RECEIVER_NOT_FOUND";
    throw err;
  }

  if (String(sender._id) === String(receiver._id)) {
    const err = new Error("Sender and receiver cannot be the same user");
    err.code = "SAME_USER";
    throw err;
  }

  // Generate unique reference
  let reference = generateTransferReference();
  // simple collision-avoid loop
  // eslint-disable-next-line no-constant-condition
  while (await Transfer.findOne({ reference })) {
    reference = generateTransferReference();
  }

  const transfer = await Transfer.create({
    reference,
    sender: sender._id,
    receiver: receiver._id,
    amount: numericAmount,
    description: description || "",
    receiverPhoneInput: receiverPhone,
    status: "CREATED",
    createdBy: sender._id,
  });

  return transfer;
}

/**
 * verifyTransferByReferenceService({ reference })
 *
 * - Finds transfer by reference
 * - Typically used to confirm that reference + amount match
 */
export async function verifyTransferByReferenceService({ reference }) {
  if (!reference) {
    const err = new Error("Reference is required");
    err.code = "REFERENCE_REQUIRED";
    throw err;
  }

  // Find the transfer
  const transfer = await Transfer.findOne({ reference: reference.trim() })
    .populate("sender", "firstName lastName phone")
    .populate("receiver", "firstName lastName phone");

  if (!transfer) {
    const err = new Error("Transfer not found for given reference");
    err.code = "TRANSFER_NOT_FOUND";
    throw err;
  }

  // Automatically update status to COMPLETED
  try {
    await updateTransferStatusByReferenceService({
      reference: reference.trim(),
      newStatus: "COMPLETED",
    });

    // OPTIONAL: you can re-fetch the updated record
    transfer.status = "COMPLETED";
  } catch (e) {
    console.error("Failed to auto-update transfer status to COMPLETED:", e);
  }

  return transfer;
}

/**
 * updateTransferStatusByReferenceService({ reference, newStatus })
 *
 * - Updates status of a transfer found by reference
 */
export async function updateTransferStatusByReferenceService({
  reference,
  newStatus,
}) {
  if (!reference || !newStatus) {
    const err = new Error("reference and newStatus are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  const normalizedStatus = normalizeStatus(newStatus);
  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    const err = new Error("Invalid transfer status");
    err.code = "INVALID_STATUS";
    throw err;
  }

  const transfer = await Transfer.findOneAndUpdate(
    { reference: reference.trim() },
    { status: normalizedStatus },
    { new: true }
  );

  if (!transfer) {
    const err = new Error("Transfer not found for given reference");
    err.code = "TRANSFER_NOT_FOUND";
    throw err;
  }

  return transfer;
}

/**
 * deleteTransferByIdService({ transferId })
 */
export async function deleteTransferByIdService({ transferId }) {
  if (!transferId) {
    const err = new Error("transferId is required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(transferId)) {
    const err = new Error("Invalid transferId");
    err.code = "INVALID_TRANSFER_ID";
    throw err;
  }

  const deleted = await Transfer.findByIdAndDelete(transferId);
  if (!deleted) {
    const err = new Error("Transfer not found");
    err.code = "TRANSFER_NOT_FOUND";
    throw err;
  }

  return deleted;
}

/**
 * listAllTransfersService()
 *
 * - Returns all transfers (for admin)
 */
export async function listAllTransfersService() {
  const transfers = await Transfer.find()
    .populate("sender receiver", "firstName lastName phone")
    .sort({ createdAt: -1 })
    .lean();

  return transfers;
}

/**
 * listTransfersForUserService({ userId })
 *
 * - Transfers where user is sender OR receiver
 */
export async function listTransfersForUserService({ userId }) {
  if (!userId) {
    const err = new Error("userId is required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(userId)) {
    const err = new Error("Invalid userId");
    err.code = "INVALID_USER_ID";
    throw err;
  }

  const transfers = await Transfer.find({
    $or: [{ sender: userId }, { receiver: userId }],
  })
    .populate("sender receiver", "firstName lastName phone")
    .sort({ createdAt: -1 })
    .lean();

  return transfers;
}

/**
 * listTransfersByStatusService({ status })
 *
 * - All transfers with a given status (for admin)
 */
export async function listTransfersByStatusService({ status }) {
  if (!status) {
    const err = new Error("status is required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  const normalizedStatus = normalizeStatus(status);

  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    const err = new Error("Invalid status");
    err.code = "INVALID_STATUS";
    throw err;
  }

  const transfers = await Transfer.find({ status: normalizedStatus })
    .populate("sender receiver", "firstName lastName phone")
    .sort({ createdAt: -1 })
    .lean();

  return transfers;
}

/**
 * listTransfersForUserByStatusService({ userId, status })
 *
 * - Transfers for a given user (sender or receiver) filtered by status
 */
export async function listTransfersForUserByStatusService({ userId, status }) {
  if (!userId || !status) {
    const err = new Error("userId and status are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(userId)) {
    const err = new Error("Invalid userId");
    err.code = "INVALID_USER_ID";
    throw err;
  }

  const normalizedStatus = normalizeStatus(status);

  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    const err = new Error("Invalid status");
    err.code = "INVALID_STATUS";
    throw err;
  }

  const transfers = await Transfer.find({
    status: normalizedStatus,
    $or: [{ sender: userId }, { receiver: userId }],
  })
    .populate("sender receiver", "firstName lastName phone")
    .sort({ createdAt: -1 })
    .lean();

  return transfers;
}

export async function calculateInterestService({ roles, amount }) {
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    const err = new Error("Invalid amount");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  // Determine the highest-level role
  // Priority: ADMIN → MEMBER → CLIENT
  let role = "CLIENT"; // default fallback
  if (roles.includes("ADMIN")) role = "ADMIN";
  else if (roles.includes("MEMBER")) role = "MEMBER";
  else if (roles.includes("CLIENT")) role = "CLIENT";

  // Default interest rules
  let rate = 0.02; // CLIENT = 2%

  if (role === "ADMIN") rate = 0; // Admin pays 0%
  if (role === "MEMBER") rate = 0.15; // Member pays 15%
  if (role === "CLIENT") rate = 0.25; // Client pays 25%

  const interest = amt * rate;
  const totalAmount = amt + interest;

  return {
    roles,
    effectiveRole: role,
    amount: amt,
    interest,
    totalAmount,
    rate,
  };
}

export async function getTransferByIdService({
  transferId,
  requesterId,
  requesterRoles = [],
}) {
  if (!transferId || !requesterId) {
    const err = new Error("transferId and requesterId are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(transferId) || !isValidObjectId(requesterId)) {
    const err = new Error("Invalid transferId or requesterId");
    err.code = "INVALID_ID";
    throw err;
  }

  const transfer = await Transfer.findById(transferId)
    .populate("sender", "firstName lastName phone")
    .populate("receiver", "firstName lastName phone");

  if (!transfer) {
    const err = new Error("Transfer not found");
    err.code = "TRANSFER_NOT_FOUND";
    throw err;
  }

  const isAdmin =
    Array.isArray(requesterRoles) && requesterRoles.some((r) => r === "ADMIN");

  const isSender = String(transfer.sender?._id) === String(requesterId);
  const isReceiver = String(transfer.receiver?._id) === String(requesterId);

  if (!isAdmin && !isSender && !isReceiver) {
    const err = new Error("Not allowed to view this transfer");
    err.code = "FORBIDDEN";
    throw err;
  }

  return transfer;
}
