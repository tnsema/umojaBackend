// controllers/transfer.controller.js

import {
  createTransferService,
  verifyTransferByReferenceService,
  updateTransferStatusByReferenceService,
  deleteTransferByIdService,
  listAllTransfersService,
  listTransfersForUserService,
  listTransfersByStatusService,
  listTransfersForUserByStatusService,
  calculateInterestService,
} from "../services/transfer.service.js";

/**
 * POST /transfers
 * Body (form-data or JSON):
 *  - receiverPhone
 *  - amount
 *  - description? (optional)
 *
 * Auth: jwtVerify (sender)
 */
export async function createTransfer(req, res) {
  try {
    const senderId = req.payload?.userId;
    const { receiverPhone, amount, description } = req.body || {};

    const transfer = await createTransferService({
      senderId,
      receiverPhone,
      amount,
      description,
    });

    return res.status(201).json({
      status: true,
      message: "Transfer created successfully",
      data: transfer,
    });
  } catch (err) {
    console.error("Error in createTransfer:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "senderId, receiverPhone and amount are required",
      });
    }

    if (err.code === "INVALID_USER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid senderId",
      });
    }

    if (err.code === "SENDER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Sender not found",
      });
    }

    if (err.code === "RECEIVER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Receiver not found with provided phone",
      });
    }

    if (err.code === "SAME_USER") {
      return res.status(400).json({
        status: false,
        message: "Sender and receiver cannot be the same user",
      });
    }

    if (err.code === "INVALID_AMOUNT") {
      return res.status(400).json({
        status: false,
        message: "Invalid transfer amount",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while creating transfer",
    });
  }
}

/**
 * GET /transfers/verify/:reference
 *
 * Auth: can be public or protected, depending on design
 */
export async function verifyTransferByReference(req, res) {
  try {
    const { reference } = req.params;

    const transfer = await verifyTransferByReferenceService({ reference });

    return res.status(200).json({
      status: true,
      message: "Transfer verified successfully",
      data: transfer,
    });
  } catch (err) {
    console.error("Error in verifyTransferByReference:", err);

    if (err.code === "REFERENCE_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "Reference is required",
      });
    }

    if (err.code === "TRANSFER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Transfer not found for given reference",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while verifying transfer",
    });
  }
}

/**
 * PATCH /transfers/:reference/status
 * Body:
 *  - newStatus ("PENDING" | "COMPLETED" | "FAILED" | "CANCELLED")
 *
 * Auth: jwtVerify + requireRole("ADMIN") (or as per your policy)
 */
export async function updateTransferStatusByReference(req, res) {
  try {
    const { reference } = req.params;
    const { newStatus } = req.body || {};

    const transfer = await updateTransferStatusByReferenceService({
      reference,
      newStatus,
    });

    return res.status(200).json({
      status: true,
      message: "Transfer status updated successfully",
      data: transfer,
    });
  } catch (err) {
    console.error("Error in updateTransferStatusByReference:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "reference and newStatus are required",
      });
    }

    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({
        status: false,
        message: "Invalid transfer status",
      });
    }

    if (err.code === "TRANSFER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Transfer not found for given reference",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while updating transfer status",
    });
  }
}

/**
 * DELETE /transfers/:transferId
 *
 * Auth: jwtVerify + requireRole("ADMIN") or ownership checks if needed
 */
export async function deleteTransferById(req, res) {
  try {
    const { transferId } = req.params;

    const deleted = await deleteTransferByIdService({ transferId });

    return res.status(200).json({
      status: true,
      message: "Transfer deleted successfully",
      data: deleted,
    });
  } catch (err) {
    console.error("Error in deleteTransferById:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "transferId is required",
      });
    }

    if (err.code === "INVALID_TRANSFER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid transferId",
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
      message: "Server error while deleting transfer",
    });
  }
}

/**
 * GET /transfers
 *
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function listAllTransfers(req, res) {
  try {
    const transfers = await listAllTransfersService();

    return res.status(200).json({
      status: true,
      data: transfers,
    });
  } catch (err) {
    console.error("Error in listAllTransfers:", err);

    return res.status(500).json({
      status: false,
      message: "Server error while listing all transfers",
    });
  }
}

/**
 * GET /transfers/me
 *
 * Auth: jwtVerify
 */
export async function listTransfersForAuthenticatedUser(req, res) {
  try {
    const userId = req.payload?.userId;

    const transfers = await listTransfersForUserService({ userId });

    return res.status(200).json({
      status: true,
      data: transfers,
    });
  } catch (err) {
    console.error("Error in listTransfersForAuthenticatedUser:", err);

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
      message: "Server error while fetching transfers for user",
    });
  }
}

/**
 * GET /transfers/user/:userId
 *
 * Auth: jwtVerify + requireRole("ADMIN") (or self)
 */
export async function listTransfersForUser(req, res) {
  try {
    const { userId } = req.params;

    const transfers = await listTransfersForUserService({ userId });

    return res.status(200).json({
      status: true,
      data: transfers,
    });
  } catch (err) {
    console.error("Error in listTransfersForUser:", err);

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
      message: "Server error while fetching transfers for user",
    });
  }
}

/**
 * GET /transfers/status/:status
 *
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function listTransfersByStatus(req, res) {
  try {
    const { status } = req.params;

    const transfers = await listTransfersByStatusService({ status });

    return res.status(200).json({
      status: true,
      data: transfers,
    });
  } catch (err) {
    console.error("Error in listTransfersByStatus:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "status is required",
      });
    }

    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({
        status: false,
        message: "Invalid status",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching transfers by status",
    });
  }
}

/**
 * GET /transfers/me/status/:status
 *
 * Auth: jwtVerify
 */
export async function listTransfersForAuthenticatedUserByStatus(req, res) {
  try {
    const userId = req.payload?.userId;
    const { status } = req.params;

    const transfers = await listTransfersForUserByStatusService({
      userId,
      status,
    });

    return res.status(200).json({
      status: true,
      data: transfers,
    });
  } catch (err) {
    console.error("Error in listTransfersForAuthenticatedUserByStatus:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "userId and status are required",
      });
    }

    if (err.code === "INVALID_USER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid userId",
      });
    }

    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({
        status: false,
        message: "Invalid status",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching transfers for user by status",
    });
  }
}

export async function calculateInterest(req, res) {
  try {
    const roles = req.payload?.roles || [];
    const { amount } = req.body || {};

    if (!amount) {
      return res.status(400).json({
        status: false,
        message: "Amount is required",
      });
    }

    const result = await calculateInterestService({
      roles,
      amount,
    });

    return res.status(200).json({
      status: true,
      message: "Interest calculated successfully",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message || "Server error while calculating interest",
    });
  }
}
