// controllers/deposit.controller.js
import {
  createDepositService,
  verifyDepositService,
  updateStatusService,
  deleteDepositService,
} from "../services/deposit.service.js";

/**
 * POST /deposits
 * Body: { amount, purpose?, bankRef?, entityId? }
 * File: pop (optional, via multer)
 */
export async function createDeposit(req, res) {
  try {
    //const userId = req.user._id; // from jwtVerify
    const userId = req.payload.userId;
    const { amount, purpose, bankRef, entityId } = req.body;

    const popUrl = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.popUrl || null;

    const deposit = await createDepositService({
      userId,
      amount: Number(amount),
      popUrl,
      purpose,
      bankRef,
      entityId,
    });

    return res.json({
      status: true,
      message: "Deposit created and pending verification",
      data: deposit,
    });
  } catch (err) {
    return res.status(400).json({
      status: false,
      message: err.message,
      code: err.code || "DEPOSIT_ERROR",
    });
  }
}

/**
 * POST /deposits/:depositId/verify
 */
export async function verifyDeposit(req, res) {
  try {
    const { depositId } = req.params;

    const result = await verifyDepositService({ depositId });

    return res.json({
      status: true,
      message: "Deposit verified and wallet credited",
      data: result,
    });
  } catch (err) {
    return res.status(400).json({
      status: false,
      message: err.message,
      code: err.code || "DEPOSIT_VERIFY_ERROR",
    });
  }
}

/**
 * PATCH /deposits/:depositId/status
 * Body: { status }
 */
export async function updateDepositStatus(req, res) {
  try {
    const { depositId } = req.params;
    const { status } = req.body;

    const deposit = await updateStatusService({ depositId, status });

    return res.json({
      status: true,
      message: "Deposit status updated",
      data: deposit,
    });
  } catch (err) {
    return res.status(400).json({
      status: false,
      message: err.message,
      code: err.code || "DEPOSIT_STATUS_ERROR",
    });
  }
}

/**
 * DELETE /deposits/:depositId
 */
export async function deleteDeposit(req, res) {
  try {
    const { depositId } = req.params;

    const result = await deleteDepositService({ depositId });

    return res.json({
      status: true,
      message: "Deposit deleted",
      data: result,
    });
  } catch (err) {
    return res.status(400).json({
      status: false,
      message: err.message,
      code: err.code || "DEPOSIT_DELETE_ERROR",
    });
  }
}
