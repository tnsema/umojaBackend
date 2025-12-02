// controllers/loanRepayment.controller.js

import {
  generateScheduleForLoan,
  createInvoiceForRepayment,
  markRepaymentLateAndGenerateInvoice,
  getRepaymentsForLoan,
} from "../services/loanRepayment.service.js";

/**
 * POST /api/loans/:loanId/repayments/generate
 *
 * Admin/system: generate or regenerate schedule for a loan.
 * No body is required – everything is derived from:
 *  - loan.requestedAmount
 *  - loan.totalRepayable
 *  - loan.penaltyFees
 *  - loan.disbursedAt
 *  - repaymentPlan.numberOfMonths
 */
export async function generateLoanRepaymentScheduleController(req, res) {
  try {
    const { loanId } = req.params;

    const repayments = await generateScheduleForLoan(loanId);

    return res.status(201).json({
      status: true,
      message: "Loan repayment schedule generated",
      data: { repayments },
    });
  } catch (err) {
    console.error("generateLoanRepaymentScheduleController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while generating repayment schedule.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /api/loans/:loanId/repayments
 * Get all repayments (installments) for a loan
 */
export async function getRepaymentsForLoanController(req, res) {
  try {
    const { loanId } = req.params;

    const result = await getRepaymentsForLoan(loanId);

    return res.json({
      status: true,
      message: "Loan repayments fetched successfully",
      data: result,
    });
  } catch (err) {
    console.error("getRepaymentsForLoanController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while fetching loan repayments.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * POST /api/repayments/:id/invoices
 * Create (or re-issue) an invoice for a given repayment
 * Body (optional): { loanRef? }
 */
export async function createInvoiceForRepaymentController(req, res) {
  try {
    const userId = req.payload?.userId;
    const { id: repaymentId } = req.params;
    const { loanRef } = req.body ?? {};

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const { repayment, invoice } = await createInvoiceForRepayment({
      repaymentId,
      userId,
      loanRef,
    });

    return res.status(201).json({
      status: true,
      message: "Invoice created for repayment",
      data: { repayment, invoice },
    });
  } catch (err) {
    console.error("createInvoiceForRepaymentController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while creating invoice for repayment.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * POST /api/repayments/:id/late
 * Mark a repayment as LATE, add late fee, and create a NEW invoice
 * Body: { lateFeeAmount }
 */
export async function markRepaymentLateAndGenerateInvoiceController(req, res) {
  try {
    const userId = req.payload?.userId;
    const { id: repaymentId } = req.params;
    const { lateFeeAmount } = req.body ?? {};

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const { repayment, invoice } = await markRepaymentLateAndGenerateInvoice({
      repaymentId,
      userId,
      lateFeeAmount,
    });

    return res.status(201).json({
      status: true,
      message:
        "Repayment marked as late and updated invoice generated successfully",
      data: { repayment, invoice },
    });
  } catch (err) {
    console.error("markRepaymentLateAndGenerateInvoiceController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while updating repayment and generating invoice.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}
