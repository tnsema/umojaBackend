// controllers/wallet.controller.js

import {
  createWalletForUserService,
  getWalletByUserService,
  depositToWalletService,
  withdrawFromWalletService,
  transferBetweenWalletsService,
} from "../services/wallet.service.js";

/**
 * POST /wallets
 * Body (form-data):
 *  - userId (required)
 *  - currency (optional, default "ZAR")
 *
 * Auth: jwtVerify + requireRole("ADMIN") at route level.
 */
export async function createWalletForUser(req, res) {
  try {
    const { userId, currency } = req.body || {};

    const wallet = await createWalletForUserService(userId, currency);

    return res.status(201).json({
      status: true,
      message: "Wallet created successfully",
      data: wallet,
    });
  } catch (err) {
    console.error("Error in createWalletForUser:", err);

    if (err.code === "USER_ID_REQUIRED") {
      return res.status(400).json({
        status: false,
        field: "userId",
        message: "UserId is required",
      });
    }

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (err.code === "WALLET_EXISTS") {
      return res.status(400).json({
        status: false,
        message: "Wallet already exists for this user",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while creating wallet",
    });
  }
}

/**
 * GET /wallets/me
 * Auth: jwtVerify
 */
export async function getMyWallet(req, res) {
  try {
    const userId = req.payload?.userId;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: missing user",
      });
    }

    const wallet = await getWalletByUserService(userId);

    return res.status(200).json({
      status: true,
      message: "Wallet fetched successfully",
      data: wallet,
    });
  } catch (err) {
    console.error("Error in getMyWallet:", err);

    if (err.code === "USER_ID_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "UserId is required",
      });
    }

    if (err.code === "WALLET_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Wallet not found for this user",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching wallet",
    });
  }
}

/**
 * POST /wallets/:walletId/deposit
 * Body (form-data):
 *  - amount (required)
 *  - reference (optional)
 *
 * Auth: jwtVerify + requireRole("ADMIN") (for now)
 */
export async function depositToWallet(req, res) {
  try {
    const adminId = req.payload?.userId;
    const { walletId } = req.params;
    const { amount, reference } = req.body || {};

    const result = await depositToWalletService({
      walletId,
      amount,
      reference,
      createdBy: adminId,
    });

    return res.status(200).json({
      status: true,
      message: "Deposit successful",
      data: result,
    });
  } catch (err) {
    console.error("Error in depositToWallet:", err);

    if (err.code === "WALLET_ID_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "walletId is required",
      });
    }

    if (err.code === "INVALID_AMOUNT") {
      return res.status(400).json({
        status: false,
        field: "amount",
        message: "Invalid deposit amount",
      });
    }

    if (err.code === "WALLET_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Wallet not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error during deposit",
    });
  }
}

/**
 * POST /wallets/:walletId/withdraw
 * Body (form-data):
 *  - amount (required)
 *  - reference (optional)
 *
 * Auth: jwtVerify + requireRole("ADMIN") (for now)
 */
export async function withdrawFromWallet(req, res) {
  try {
    const adminId = req.payload?.userId;
    const { walletId } = req.params;
    const { amount, reference } = req.body || {};

    const result = await withdrawFromWalletService({
      walletId,
      amount,
      reference,
      createdBy: adminId,
    });

    return res.status(200).json({
      status: true,
      message: "Withdrawal successful",
      data: result,
    });
  } catch (err) {
    console.error("Error in withdrawFromWallet:", err);

    if (err.code === "WALLET_ID_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "walletId is required",
      });
    }

    if (err.code === "INVALID_AMOUNT") {
      return res.status(400).json({
        status: false,
        field: "amount",
        message: "Invalid withdrawal amount",
      });
    }

    if (err.code === "WALLET_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Wallet not found",
      });
    }

    if (err.code === "INSUFFICIENT_FUNDS") {
      return res.status(400).json({
        status: false,
        field: "amount",
        message: "Insufficient wallet balance",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error during withdrawal",
    });
  }
}

/**
 * POST /wallets/transfer
 * Body (form-data):
 *  - fromWalletId
 *  - toWalletId
 *  - amount
 *  - reference (optional)
 *
 * Auth: jwtVerify + requireRole("ADMIN") (for now)
 */
export async function transferBetweenWallets(req, res) {
  try {
    const adminId = req.payload?.userId;
    const { fromWalletId, toWalletId, amount, reference } = req.body || {};

    const result = await transferBetweenWalletsService({
      fromWalletId,
      toWalletId,
      amount,
      reference,
      createdBy: adminId,
    });

    return res.status(200).json({
      status: true,
      message: "Transfer completed successfully",
      data: result,
    });
  } catch (err) {
    console.error("Error in transferBetweenWallets:", err);

    if (err.code === "WALLET_ID_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "Both fromWalletId and toWalletId are required",
      });
    }

    if (err.code === "SAME_WALLET") {
      return res.status(400).json({
        status: false,
        message: "Cannot transfer to the same wallet",
      });
    }

    if (err.code === "INVALID_AMOUNT") {
      return res.status(400).json({
        status: false,
        field: "amount",
        message: "Invalid transfer amount",
      });
    }

    if (err.code === "FROM_WALLET_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Source wallet not found",
      });
    }

    if (err.code === "TO_WALLET_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Destination wallet not found",
      });
    }

    if (err.code === "CURRENCY_MISMATCH") {
      return res.status(400).json({
        status: false,
        message: "Cannot transfer between different currencies",
      });
    }

    if (err.code === "INSUFFICIENT_FUNDS") {
      return res.status(400).json({
        status: false,
        field: "amount",
        message: "Insufficient funds in source wallet",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error during wallet transfer",
    });
  }
}
