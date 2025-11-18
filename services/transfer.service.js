// services/transfer.service.js
// Handles creation & verification of money transfers in Umoja.

import Models from "../model/model.js";
import mongoose from "mongoose";

const {
  user: User,
  role: Role,
  wallet: Wallet,
  walletTransaction: WalletTransaction,
  transfer: Transfer,
} = Models;

const { isValidObjectId } = mongoose;

// Helper: find or create recipient user (shadow CLIENT if needed)
async function ensureRecipientUser({ phone, firstName, lastName }) {
  let user = await User.findOne({ phone });

  if (user) return user;

  // Create shadow client (no password, PENDING_KYC)
  const clientRole = await Role.findOne({ name: "CLIENT" });
  if (!clientRole) {
    const err = new Error("CLIENT role not found");
    err.code = "ROLE_NOT_FOUND";
    throw err;
  }

  user = await User.create({
    phone,
    firstName: firstName || "",
    lastName: lastName || "",
    email: null,
    passwordHash: null,
    roles: [clientRole._id],
    status: "PENDING_KYC",
  });

  // Create wallet for new user
  await Wallet.create({
    userId: user._id,
    balance: 0,
    currency: "CDF", // or whichever default you choose
  });

  return user;
}

/**
 * createTransferRequest({
 *   senderId,
 *   recipientPhone,
 *   recipientFirstName?,   // optional
 *   recipientLastName?,    // optional
 *   amount,
 *   bankRef,
 *   proofDocId,
 * })
 *
 * - Ensures sender exists
 * - Ensures recipient user exists (or creates shadow CLIENT)
 * - Creates Transfer with status PENDING_VERIFICATION
 */
export async function createTransferRequestService({
  senderId,
  recipientPhone,
  recipientFirstName,
  recipientLastName,
  amount,
  bankRef,
  proofDocId,
}) {
  if (!senderId || !recipientPhone || !amount) {
    const err = new Error("senderId, recipientPhone and amount are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(senderId)) {
    const err = new Error("Invalid senderId");
    err.code = "INVALID_SENDER_ID";
    throw err;
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    const err = new Error("Invalid amount");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  // Ensure sender exists
  const sender = await User.findById(senderId);
  if (!sender) {
    const err = new Error("Sender not found");
    err.code = "SENDER_NOT_FOUND";
    throw err;
  }

  // Ensure recipient user exists (or create shadow)
  const recipient = await ensureRecipientUser({
    phone: recipientPhone,
    firstName: recipientFirstName,
    lastName: recipientLastName,
  });

  // Generate system reference
  const systemRef = `TRX-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  const transfer = await Transfer.create({
    senderId: sender._id,
    recipientId: recipient._id, // make sure Transfer schema has this
    recipientPhone,
    amount: numericAmount,
    bankRef: bankRef || "",
    systemRef,
    status: "PENDING_VERIFICATION",
    proofOfPaymentDocId: proofDocId || null,
  });

  return transfer;
}

/**
 * verifyTransfer({
 *   transferId,
 *   adminId,
 *   decision,      // "APPROVE" | "REJECT"
 *   adminComment?
 * })
 *
 * APPROVE:
 *  - credit sender wallet (DEPOSIT) for bank deposit
 *  - debit sender wallet (TRANSFER_OUT)
 *  - credit recipient wallet (TRANSFER_IN)
 *  - set Transfer.status = "READY_FOR_PAYOUT"
 *
 * REJECT:
 *  - set Transfer.status = "CANCELLED"
 */
export async function verifyTransferService({
  transferId,
  adminId,
  decision,
  adminComment,
}) {
  if (!transferId || !adminId || !decision) {
    const err = new Error("transferId, adminId and decision are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(transferId) || !isValidObjectId(adminId)) {
    const err = new Error("Invalid transferId or adminId");
    err.code = "INVALID_ID";
    throw err;
  }

  const decisionUpper = String(decision).trim().toUpperCase();
  if (!["APPROVE", "REJECT"].includes(decisionUpper)) {
    const err = new Error("Invalid decision");
    err.code = "INVALID_DECISION";
    throw err;
  }

  const transfer = await Transfer.findById(transferId);
  if (!transfer) {
    const err = new Error("Transfer not found");
    err.code = "TRANSFER_NOT_FOUND";
    throw err;
  }

  if (transfer.status !== "PENDING_VERIFICATION") {
    const err = new Error("Transfer is not in a verifiable state");
    err.code = "NOT_VERIFIABLE";
    throw err;
  }

  // Attach comment and verifier
  transfer.adminComment = adminComment || transfer.adminComment;
  transfer.verifiedBy = adminId;
  transfer.verifiedAt = new Date();

  if (decisionUpper === "REJECT") {
    transfer.status = "CANCELLED";
    await transfer.save();
    return { transfer, walletChanges: null, walletTransactions: [] };
  }

  // APPROVE FLOW
  // Ensure wallets for sender + recipient
  let senderWallet = await Wallet.findOne({ userId: transfer.senderId });
  let recipientWallet = await Wallet.findOne({ userId: transfer.recipientId });

  if (!senderWallet) {
    senderWallet = await Wallet.create({
      userId: transfer.senderId,
      balance: 0,
      currency: "CDF",
    });
  }

  if (!recipientWallet) {
    recipientWallet = await Wallet.create({
      userId: transfer.recipientId,
      balance: 0,
      currency: "CDF",
    });
  }

  const amount = transfer.amount;

  // 1) Credit sender wallet with DEPOSIT (confirmed)
  senderWallet.balance += amount;
  await senderWallet.save();

  const depositTx = await WalletTransaction.create({
    walletId: senderWallet._id,
    type: "DEPOSIT",
    amount,
    reference: `BANK_REF:${transfer.bankRef || transfer.systemRef}`,
    status: "CONFIRMED",
    proofOfPaymentDocId: transfer.proofOfPaymentDocId || null,
    createdBy: transfer.senderId,
    verifiedBy: adminId,
    verifiedAt: new Date(),
  });

  // 2) Internal transfer: sender → recipient
  // Debit sender
  senderWallet.balance -= amount;
  await senderWallet.save();

  const transferOutTx = await WalletTransaction.create({
    walletId: senderWallet._id,
    type: "TRANSFER_OUT",
    amount,
    reference: `TRX_OUT:${transfer.systemRef}`,
    status: "CONFIRMED",
    createdBy: transfer.senderId,
    verifiedBy: adminId,
    verifiedAt: new Date(),
  });

  // Credit recipient
  recipientWallet.balance += amount;
  await recipientWallet.save();

  const transferInTx = await WalletTransaction.create({
    walletId: recipientWallet._id,
    type: "TRANSFER_IN",
    amount,
    reference: `TRX_IN:${transfer.systemRef}`,
    status: "CONFIRMED",
    createdBy: transfer.senderId,
    verifiedBy: adminId,
    verifiedAt: new Date(),
  });

  // Update transfer status → ready for cash payout
  transfer.status = "READY_FOR_PAYOUT";
  await transfer.save();

  return {
    transfer,
    walletChanges: {
      senderWallet,
      recipientWallet,
    },
    walletTransactions: {
      depositTx,
      transferOutTx,
      transferInTx,
    },
  };
}

/**
 * listUserTransfers(userId)
 *
 * Returns transfers where user is sender or recipient.
 */
export async function listUserTransfersService(userId) {
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
    $or: [{ senderId: userId }, { recipientId: userId }],
  })
    .sort({ createdAt: -1 })
    .lean();

  return transfers;
}

/**
 * getTransferByRef(systemRef)
 */
export async function getTransferByRefService(systemRef) {
  if (!systemRef) {
    const err = new Error("systemRef is required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  const transfer = await Transfer.findOne({ systemRef })
    .populate("senderId", "firstName lastName phone email")
    .populate("recipientId", "firstName lastName phone email")
    .lean();

  if (!transfer) {
    const err = new Error("Transfer not found");
    err.code = "TRANSFER_NOT_FOUND";
    throw err;
  }

  return transfer;
}
