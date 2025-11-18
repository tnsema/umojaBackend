// services/wallet.service.js
// Business logic for wallet operations:
// - create wallet
// - get wallet by user
// - deposit / withdraw
// - transfer between wallets

import Models from "../model/model.js";

const {
  wallet: Wallet,
  walletTransaction: WalletTransaction,
  user: User,
} = Models;

/**
 * createWalletForUser(userId, currency)
 *
 * Creates a wallet for a user if one does not exist.
 */
export async function createWalletForUserService(userId, currency = "ZAR") {
  if (!userId) {
    const err = new Error("UserId is required");
    err.code = "USER_ID_REQUIRED";
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const existing = await Wallet.findOne({ userId });
  if (existing) {
    const err = new Error("Wallet already exists for this user");
    err.code = "WALLET_EXISTS";
    throw err;
  }

  const wallet = await Wallet.create({
    userId,
    balance: 0,
    currency,
  });

  return wallet;
}

/**
 * getWalletByUser(userId)
 */
export async function getWalletByUserService(userId) {
  if (!userId) {
    const err = new Error("UserId is required");
    err.code = "USER_ID_REQUIRED";
    throw err;
  }

  const wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    const err = new Error("Wallet not found");
    err.code = "WALLET_NOT_FOUND";
    throw err;
  }

  return wallet;
}

/**
 * depositToWallet({ walletId, amount, reference, createdBy })
 *
 * Credits the wallet and creates a DEPOSIT WalletTransaction.
 * For MVP we mark it as CONFIRMED directly.
 */
export async function depositToWalletService({
  walletId,
  amount,
  reference,
  createdBy,
}) {
  if (!walletId) {
    const err = new Error("walletId is required");
    err.code = "WALLET_ID_REQUIRED";
    throw err;
  }

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    const err = new Error("Invalid deposit amount");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  const wallet = await Wallet.findById(walletId);
  if (!wallet) {
    const err = new Error("Wallet not found");
    err.code = "WALLET_NOT_FOUND";
    throw err;
  }

  const depositAmount = Number(amount);

  // Update balance
  wallet.balance += depositAmount;
  await wallet.save();

  const tx = await WalletTransaction.create({
    walletId: wallet._id,
    type: "DEPOSIT", // must be in your enum
    amount: depositAmount,
    reference: reference || null,
    status: "CONFIRMED",
    proofOfPaymentDocId: null,
    createdBy: createdBy || null,
    verifiedBy: createdBy || null,
    verifiedAt: new Date(),
  });

  return { wallet, transaction: tx };
}

/**
 * withdrawFromWallet({ walletId, amount, reference, createdBy })
 *
 * Debits the wallet and creates a WITHDRAWAL transaction.
 */
export async function withdrawFromWalletService({
  walletId,
  amount,
  reference,
  createdBy,
}) {
  if (!walletId) {
    const err = new Error("walletId is required");
    err.code = "WALLET_ID_REQUIRED";
    throw err;
  }

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    const err = new Error("Invalid withdrawal amount");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  const wallet = await Wallet.findById(walletId);
  if (!wallet) {
    const err = new Error("Wallet not found");
    err.code = "WALLET_NOT_FOUND";
    throw err;
  }

  const withdrawalAmount = Number(amount);

  if (wallet.balance < withdrawalAmount) {
    const err = new Error("Insufficient balance");
    err.code = "INSUFFICIENT_FUNDS";
    throw err;
  }

  wallet.balance -= withdrawalAmount;
  await wallet.save();

  const tx = await WalletTransaction.create({
    walletId: wallet._id,
    type: "WITHDRAWAL",
    amount: withdrawalAmount,
    reference: reference || null,
    status: "CONFIRMED",
    createdBy: createdBy || null,
    verifiedBy: createdBy || null,
    verifiedAt: new Date(),
  });

  return { wallet, transaction: tx };
}

/**
 * transferBetweenWallets({ fromWalletId, toWalletId, amount, reference, createdBy })
 *
 * Internal transfer:
 *  - debit fromWallet
 *  - credit toWallet
 *  - create TRANSFER_OUT + TRANSFER_IN transactions
 */
export async function transferBetweenWalletsService({
  fromWalletId,
  toWalletId,
  amount,
  reference,
  createdBy,
}) {
  if (!fromWalletId || !toWalletId) {
    const err = new Error("Both fromWalletId and toWalletId are required");
    err.code = "WALLET_ID_REQUIRED";
    throw err;
  }

  if (fromWalletId === toWalletId) {
    const err = new Error("Cannot transfer to the same wallet");
    err.code = "SAME_WALLET";
    throw err;
  }

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    const err = new Error("Invalid transfer amount");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  const txAmount = Number(amount);

  const fromWallet = await Wallet.findById(fromWalletId);
  if (!fromWallet) {
    const err = new Error("Source wallet not found");
    err.code = "FROM_WALLET_NOT_FOUND";
    throw err;
  }

  const toWallet = await Wallet.findById(toWalletId);
  if (!toWallet) {
    const err = new Error("Destination wallet not found");
    err.code = "TO_WALLET_NOT_FOUND";
    throw err;
  }

  if (fromWallet.currency !== toWallet.currency) {
    const err = new Error("Cannot transfer between different currencies");
    err.code = "CURRENCY_MISMATCH";
    throw err;
  }

  if (fromWallet.balance < txAmount) {
    const err = new Error("Insufficient funds in source wallet");
    err.code = "INSUFFICIENT_FUNDS";
    throw err;
  }

  // Debit source
  fromWallet.balance -= txAmount;
  await fromWallet.save();

  const outTx = await WalletTransaction.create({
    walletId: fromWallet._id,
    type: "TRANSFER_OUT",
    amount: txAmount,
    reference: reference || null,
    status: "CONFIRMED",
    createdBy: createdBy || null,
    verifiedBy: createdBy || null,
    verifiedAt: new Date(),
  });

  // Credit destination
  toWallet.balance += txAmount;
  await toWallet.save();

  const inTx = await WalletTransaction.create({
    walletId: toWallet._id,
    type: "TRANSFER_IN",
    amount: txAmount,
    reference: reference || null,
    status: "CONFIRMED",
    createdBy: createdBy || null,
    verifiedBy: createdBy || null,
    verifiedAt: new Date(),
  });

  return {
    fromWallet,
    toWallet,
    transactions: {
      outTx,
      inTx,
    },
  };
}
