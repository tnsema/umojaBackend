// controllers/transfer.controller.js

import {
  createTransferRequestService,
  verifyTransferService,
  listUserTransfersService,
  getTransferByRefService,
} from "../services/transfer.service.js";

/**
 * POST /transfers
 *
 * Body (form-data):
 *  - recipientPhone
 *  - recipientFirstName?   (optional, for shadow client)
 *  - recipientLastName?    (optional)
 *  - amount
 *  - bankRef?
 *  - proofDocId?
 *
 * Auth: jwtVerify (sender)
 */
export async function createTransferRequest(req, res) {
  try {
    const senderId = req.payload?.userId;
    const {
      recipientPhone,
      recipientFirstName,
      recipientLastName,
      amount,
      bankRef,
      proofDocId,
    } = req.body || {};

    const transfer = await createTransferRequestService({
      senderId,
      recipientPhone,
      recipientFirstName,
      recipientLastName,
      amount,
      bankRef,
      proofDocId,
    });

    return res.status(201).json({
      status: true,
      message: "Transfer request created successfully",
      data: transfer,
    });
  } catch (err) {
    console.error("Error in createTransferRequest:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "senderId, recipientPhone and amount are required",
      });
    }

    if (err.code === "INVALID_SENDER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid senderId",
      });
    }

    if (err.code === "INVALID_AMOUNT") {
      return res.status(400).json({
        status: false,
        message: "Invalid amount",
      });
    }

    if (err.code === "SENDER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Sender not found",
      });
    }

    if (err.code === "ROLE_NOT_FOUND") {
      return res.status(500).json({
        status: false,
        message: "CLIENT role not found for creating shadow user",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while creating transfer request",
    });
  }
}

/**
 * POST /transfers/:transferId/verify
 *
 * Body (form-data):
 *  - decision ("APPROVE" | "REJECT")
 *  - adminComment? (optional)
 *
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function verifyTransfer(req, res) {
  try {
    const adminId = req.payload?.userId;
    const { transferId } = req.params;
    const { decision, adminComment } = req.body || {};

    const result = await verifyTransferService({
      transferId,
      adminId,
      decision,
      adminComment,
    });

    return res.status(200).json({
      status: true,
      message: "Transfer verification processed successfully",
      data: result,
    });
  } catch (err) {
    console.error("Error in verifyTransfer:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "transferId, adminId and decision are required",
      });
    }

    if (err.code === "INVALID_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid transferId or adminId",
      });
    }

    if (err.code === "INVALID_DECISION") {
      return res.status(400).json({
        status: false,
        message: "Decision must be APPROVE or REJECT",
      });
    }

    if (err.code === "TRANSFER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Transfer not found",
      });
    }

    if (err.code === "NOT_VERIFIABLE") {
      return res.status(400).json({
        status: false,
        message: "Transfer is not in a verifiable state",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while verifying transfer",
    });
  }
}

/**
 * GET /transfers/me
 *
 * Auth: jwtVerify
 *
 * OR
 * GET /transfers/user/:userId  (admin-only, depending on route config)
 */
export async function listMyTransfers(req, res) {
  try {
    const userId = req.payload?.userId;

    const transfers = await listUserTransfersService(userId);

    return res.status(200).json({
      status: true,
      data: transfers,
    });
  } catch (err) {
    console.error("Error in listMyTransfers:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "userId is required",
      });
    }

    if (err.code === "INVALID_USER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid userId",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while listing user transfers",
    });
  }
}

export async function listUserTransfers(req, res) {
  try {
    const { userId } = req.params;

    const transfers = await listUserTransfersService(userId);

    return res.status(200).json({
      status: true,
      data: transfers,
    });
  } catch (err) {
    console.error("Error in listUserTransfers:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "userId is required",
      });
    }

    if (err.code === "INVALID_USER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid userId",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while listing user transfers",
    });
  }
}

/**
 * GET /transfers/ref/:systemRef
 *
 * Auth: jwtVerify (or relaxed, depending)
 */
export async function getTransferByRef(req, res) {
  try {
    const { systemRef } = req.params;

    const transfer = await getTransferByRefService(systemRef);

    return res.status(200).json({
      status: true,
      data: transfer,
    });
  } catch (err) {
    console.error("Error in getTransferByRef:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "systemRef is required",
      });
    }

    if (err.code === "TRANSFER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Transfer not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching transfer by reference",
    });
  }
}
