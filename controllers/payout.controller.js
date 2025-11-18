// controllers/payout.controller.js

import {
  createPayoutService,
  updatePayoutStatusService,
  verifyPayoutService,
} from "../services/payout.service.js";

/**
 * POST /payouts
 *
 * Body (form-data):
 *  - transferId
 *  - proofDocId? (optional)
 *
 * Auth: jwtVerify + requireRole("PAYING_AGENT" or "ADMIN") at route level
 */
export async function createPayout(req, res) {
  try {
    const agentId = req.payload?.userId;
    const { transferId, proofDocId } = req.body || {};

    const result = await createPayoutService({
      transferId,
      agentId,
      proofDocId,
    });

    return res.status(201).json({
      status: true,
      message: "Payout created successfully",
      data: result,
    });
  } catch (err) {
    console.error("Error in createPayout:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "transferId and agentId are required",
      });
    }

    if (err.code === "INVALID_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid transferId or agentId",
      });
    }

    if (err.code === "TRANSFER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Transfer not found",
      });
    }

    if (err.code === "AGENT_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Paying agent not found",
      });
    }

    if (err.code === "DUPLICATE_PAYOUT") {
      return res.status(409).json({
        status: false,
        message: "Payout already exists for this transfer",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while creating payout",
    });
  }
}

/**
 * POST /payouts/:payoutId/status
 *
 * Body (form-data):
 *  - status ("PENDING" | "COMPLETED")
 *
 * Auth: jwtVerify + requireRole("PAYING_AGENT", "ADMIN")
 */
export async function updatePayoutStatus(req, res) {
  try {
    const { payoutId } = req.params;
    const { status } = req.body || {};

    const payout = await updatePayoutStatusService({ payoutId, status });

    return res.status(200).json({
      status: true,
      message: "Payout status updated successfully",
      data: payout,
    });
  } catch (err) {
    console.error("Error in updatePayoutStatus:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "payoutId and status are required",
      });
    }

    if (err.code === "INVALID_PAYOUT_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid payoutId",
      });
    }

    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({
        status: false,
        message: "Invalid payout status",
      });
    }

    if (err.code === "PAYOUT_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Payout not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while updating payout status",
    });
  }
}

/**
 * POST /payouts/verify
 *
 * Body (form-data) or Query:
 *  - ref (payoutReference)
 *
 * This can be used by:
 *  - Agent: to confirm a ref is valid before paying
 *  - Recipient: to check their payout status
 *
 * Auth: jwtVerify (optional – you can relax or enforce via routes)
 */
export async function verifyPayout(req, res) {
  try {
    const ref = req.body?.ref || req.query?.ref;

    const payout = await verifyPayoutService(ref);

    return res.status(200).json({
      status: true,
      message: "Payout reference verified",
      data: payout,
    });
  } catch (err) {
    console.error("Error in verifyPayout:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "Reference is required",
      });
    }

    if (err.code === "PAYOUT_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Payout not found for this reference",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while verifying payout",
    });
  }
}
