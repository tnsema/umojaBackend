// services/deposit.service.js
// Business logic for deposits (PoP), verification, status updates, etc.

import Models from "../model/model.js";
import {
  DepositStatus,
  DepositPurpose,
  LinkedEntityTypes,
} from "../schema/Deposit.js";

const { deposit: Deposit, wallet: Wallet } = Models;

// Map certain purposes to a default linked entity type (entityId will be set later)
const PURPOSE_TO_ENTITY_TYPE = {
  [DepositPurpose.TRANSFER_FUNDING]: LinkedEntityTypes.TRANSFER,
  [DepositPurpose.CONTRIBUTION]: LinkedEntityTypes.CONTRIBUTION,
  [DepositPurpose.LOAN]: LinkedEntityTypes.LOAN,
  [DepositPurpose.PROJECT]: LinkedEntityTypes.PROJECT,
};

/**
 * Create a new deposit.
 * - userId         (required)
 * - amount         (required)
 * - popUrl         (optional)
 * - purpose        (optional, defaults to WALLET_TOPUP)
 * - bankRef        (optional)
 * - entityId       (optional: if you already know the linked entity id)
 */
export async function createDepositService({
  userId,
  amount,
  popUrl = null,
  purpose = DepositPurpose.WALLET_TOPUP,
  bankRef = null,
  entityId = null,
}) {
  if (!userId) {
    const err = new Error("userId is required");
    err.code = "USER_ID_REQUIRED";
    throw err;
  }

  if (!amount || amount <= 0) {
    const err = new Error("Amount must be greater than zero");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  // Normalize purpose
  const finalPurpose =
    purpose && Object.values(DepositPurpose).includes(purpose)
      ? purpose
      : DepositPurpose.WALLET_TOPUP;

  // Build linkedEntity based on purpose or null
  let linkedEntity = {
    entityType: null,
    entityId: null,
  };

  const autoEntityType = PURPOSE_TO_ENTITY_TYPE[finalPurpose];
  if (autoEntityType) {
    linkedEntity = {
      entityType: autoEntityType,
      entityId: entityId || null,
    };
  }

  const deposit = await Deposit.create({
    userId,
    amount,
    popUrl,
    bankRef,
    purpose: finalPurpose,
    status: DepositStatus.PENDING,
    linkedEntity,
  });

  return deposit;
}

/**
 * Verify a deposit:
 * - status must be PENDING
 * - mark as VERIFIED
 * - credit user's wallet
 */
export async function verifyDepositService({ depositId }) {
  if (!depositId) {
    const err = new Error("depositId is required");
    err.code = "DEPOSIT_ID_REQUIRED";
    throw err;
  }

  const deposit = await Deposit.findById(depositId);
  if (!deposit) {
    const err = new Error("Deposit not found");
    err.code = "DEPOSIT_NOT_FOUND";
    throw err;
  }

  if (deposit.status !== DepositStatus.PENDING) {
    const err = new Error("Deposit already processed");
    err.code = "DEPOSIT_ALREADY_PROCESSED";
    throw err;
  }

  // Mark verified
  deposit.status = DepositStatus.VERIFIED;
  deposit.processedAt = new Date();
  await deposit.save();

  // Ensure wallet exists, then credit it
  let wallet = await Wallet.findOne({ userId: deposit.userId });
  if (!wallet) {
    wallet = await Wallet.create({
      userId: deposit.userId,
      balance: 0,
      currency: "ZAR", // you can change this or infer from user
    });
  }

  wallet.balance += deposit.amount;
  await wallet.save();

  // At this stage you can trigger extra flows based on linkedEntity.entityType
  // e.g. update transfer / contribution / loan, etc.
  // Keep minimal for now as requested.

  return { deposit, wallet };
}

/**
 * Generic status update (ADMIN only).
 * - Allows setting PENDING, VERIFIED, REJECTED
 * - Handles processedAt automatically
 */
export async function updateStatusService({ depositId, status }) {
  if (!depositId) {
    const err = new Error("depositId is required");
    err.code = "DEPOSIT_ID_REQUIRED";
    throw err;
  }

  if (!Object.values(DepositStatus).includes(status)) {
    const err = new Error("Invalid deposit status");
    err.code = "INVALID_DEPOSIT_STATUS";
    throw err;
  }

  const deposit = await Deposit.findById(depositId);
  if (!deposit) {
    const err = new Error("Deposit not found");
    err.code = "DEPOSIT_NOT_FOUND";
    throw err;
  }

  deposit.status = status;

  if (status === DepositStatus.VERIFIED || status === DepositStatus.REJECTED) {
    deposit.processedAt = deposit.processedAt || new Date();
  } else {
    // if moved back to PENDING
    deposit.processedAt = null;
  }

  await deposit.save();
  return deposit;
}

/**
 * Delete a deposit (for admin tools / testing).
 */
export async function deleteDepositService({ depositId }) {
  if (!depositId) {
    const err = new Error("depositId is required");
    err.code = "DEPOSIT_ID_REQUIRED";
    throw err;
  }

  const deposit = await Deposit.findById(depositId);
  if (!deposit) {
    const err = new Error("Deposit not found");
    err.code = "DEPOSIT_NOT_FOUND";
    throw err;
  }

  await Deposit.deleteOne({ _id: depositId });

  return { deleted: true };
}
