// services/walletTransaction.service.js
import Models from "../model/model.js";
import {
  depositToWalletService,
  withdrawFromWalletService,
} from "./wallet.service.js";

import WalletTransaction, {
  WalletTransactionTypes,
  WalletTransactionDirection,
  WalletTransactionStatus,
} from "../schema/WalletTransaction.js";

const { wallet: Wallet } = Models;

/**
 * Creates a wallet ledger entry AND updates wallet balance
 * This is the main engine for ALL wallet movements.
 */
export async function recordWalletTransactionService({
  walletId,
  amount,
  type,
  direction,
  relatedType = "OTHER",
  relatedId = null,
  reference = null,
  createdBy = null,
  meta = {},
}) {
  if (!walletId) {
    const err = new Error("walletId is required");
    err.code = "WALLET_ID_REQUIRED";
    throw err;
  }

  if (!amount || Number(amount) <= 0) {
    const err = new Error("Invalid amount");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  if (!type) {
    const err = new Error("Transaction type required");
    err.code = "TYPE_REQUIRED";
    throw err;
  }

  if (!direction) {
    const err = new Error("Direction (DEBIT/CREDIT) required");
    err.code = "DIRECTION_REQUIRED";
    throw err;
  }

  const wallet = await Wallet.findById(walletId);
  if (!wallet) {
    const err = new Error("Wallet not found");
    err.code = "WALLET_NOT_FOUND";
    throw err;
  }

  const numericAmount = Number(amount);

  const balanceBefore = wallet.balance;

  // APPLY DEBIT / CREDIT via wallet.service.js
  if (direction === WalletTransactionDirection.CREDIT) {
    await depositToWalletService({
      walletId,
      amount: numericAmount,
      reference,
      createdBy,
    });
  }

  if (direction === WalletTransactionDirection.DEBIT) {
    await withdrawFromWalletService({
      walletId,
      amount: numericAmount,
      reference,
      createdBy,
    });
  }

  // Fetch updated balance
  const updated = await Wallet.findById(walletId);
  const balanceAfter = updated.balance;

  // CREATE ledger entry
  const tx = await WalletTransaction.create({
    walletId,
    direction,
    type,
    amount: numericAmount,
    balanceBefore,
    balanceAfter,
    relatedType,
    relatedId,
    reference,
    status: WalletTransactionStatus.CONFIRMED,
    createdBy,
    meta,
  });

  return tx;
}

/**
 * Fetch wallet transactions by walletId
 */
export async function listWalletTransactionsService(walletId) {
  if (!walletId) {
    const err = new Error("walletId required");
    err.code = "WALLET_ID_REQUIRED";
    throw err;
  }

  return WalletTransaction.find({ walletId }).sort({ createdAt: -1 });
}

/**
 * Fetch single transaction
 */
export async function getWalletTransactionByIdService(id) {
  const tx = await WalletTransaction.findById(id);
  if (!tx) {
    const err = new Error("Transaction not found");
    err.code = "TX_NOT_FOUND";
    throw err;
  }
  return tx;
}
