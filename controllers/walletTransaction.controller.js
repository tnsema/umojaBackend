// controllers/walletTransaction.controller.js
import {
  recordWalletTransactionService,
  listWalletTransactionsService,
  getWalletTransactionByIdService,
} from "../services/walletTransaction.service.js";

export async function createWalletTransaction(req, res) {
  try {
    const payload = {
      walletId: req.body.walletId,
      amount: req.body.amount,
      type: req.body.type,
      direction: req.body.direction,
      relatedType: req.body.relatedType,
      relatedId: req.body.relatedId,
      reference: req.body.reference,
      createdBy: req.payload?.userId || null,
      meta: req.body.meta || {},
    };

    const tx = await recordWalletTransactionService(payload);

    return res.status(201).json({
      status: true,
      message: "Transaction recorded",
      data: tx,
    });
  } catch (err) {
    console.error("TX ERROR:", err);

    return res.status(400).json({
      status: false,
      message: err.message || "Failed to record transaction",
      code: err.code || "TX_ERROR",
    });
  }
}

export async function listWalletTransactions(req, res) {
  try {
    const walletId = req.params.walletId;

    const list = await listWalletTransactionsService(walletId);

    return res.status(200).json({
      status: true,
      data: list,
    });
  } catch (err) {
    return res.status(400).json({
      status: false,
      message: err.message,
      code: err.code,
    });
  }
}

export async function getWalletTransaction(req, res) {
  try {
    const txId = req.params.id;

    const tx = await getWalletTransactionByIdService(txId);

    return res.status(200).json({
      status: true,
      data: tx,
    });
  } catch (err) {
    return res.status(404).json({
      status: false,
      message: err.message,
    });
  }
}
