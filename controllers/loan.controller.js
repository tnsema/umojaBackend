// controllers/loan.controller.js

import {
  createLoan,
  getLoanById as getLoanByIdService,
  getUserLoans as getUserLoansService,
  getAllLoans as getAllLoansService,
  deleteLoan as deleteLoanService,
  adminReviewLoan,
  guarantorDecision,
  borrowerConfirmLoan,
  disburseLoan,
  cancelLoan,
} from "../services/loan.service.js";

/**
 * POST /loans
 * Logged-in borrower creates a loan request
 * req.payload.userId -> borrowerId
 * req.payload.roles  -> roles (e.g. ["MEMBER", "ADMIN"])
 */
export async function createLoanController(req, res, next) {
  try {
    const borrowerId = req.payload?.userId;
    const roles = req.payload?.roles || [];

    const {
      guarantorId,
      repaymentPlanId,
      requestedAmount,
      purpose,
      adminComment,
      collateral,
      references,
    } = req.body;

    const loan = await createLoan({
      borrowerId,
      roles,
      guarantorId,
      repaymentPlanId,
      requestedAmount,
      purpose,
      adminComment,
      collateral,
      references,
    });

    return res.status(201).json({
      status: true,
      message: "Loan request submitted",
      data: { loan },
    });
  } catch (err) {
    console.error("createLoanController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while creating the loan.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /loans/:id
 * Get a single loan with collateral + references
 */
export async function getLoanByIdController(req, res, next) {
  try {
    const { id } = req.params;

    const data = await getLoanByIdService(id);

    return res.json({
      status: true,
      message: "Loan fetched successfully",
      data,
    });
  } catch (err) {
    console.error("getLoanByIdController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while fetching the loan.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * USER: GET /loans/me
 * Uses getUserLoansService with borrowerId = logged-in user
 */
export async function getMyLoansController(req, res, next) {
  try {
    const borrowerId = req.payload?.userId;

    if (!borrowerId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const { page, limit, status } = req.query;

    const result = await getUserLoansService({
      borrowerId,
      page,
      limit,
      status,
    });

    return res.json({
      status: true,
      message: "Loans fetched successfully",
      data: result,
    });
  } catch (err) {
    console.error("getMyLoansController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while fetching the user's loans.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: GET /admin/users/:userId/loans
 * Also uses getUserLoansService, but borrowerId comes from route param
 */
export async function getUserLoansAdminController(req, res, next) {
  try {
    const { userId } = req.params; // borrowerId
    const { page, limit, status } = req.query;

    const result = await getUserLoansService({
      borrowerId: userId,
      page,
      limit,
      status,
    });

    return res.json({
      status: true,
      message: "User loans fetched successfully",
      data: result,
    });
  } catch (err) {
    console.error("getUserLoansAdminController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while fetching loans for this user.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: GET /admin/loans
 * Uses getAllLoansService – all loans (with optional filters)
 */
export async function getAllLoansController(req, res, next) {
  try {
    const { page, limit, status, borrowerId, guarantorId } = req.query;

    const result = await getAllLoansService({
      page,
      limit,
      status,
      borrowerId,
      guarantorId,
    });

    return res.json({
      status: true,
      message: "All loans fetched successfully",
      data: result,
    });
  } catch (err) {
    console.error("getAllLoansController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while fetching all loans.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: DELETE /admin/loans/:id
 * Deletes loan + its collateral + references
 */
export async function deleteLoanController(req, res, next) {
  try {
    const { id } = req.params;

    const result = await deleteLoanService(id);

    return res.json({
      status: true,
      message: "Loan deleted successfully",
      data: result,
    });
  } catch (err) {
    console.error("deleteLoanController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while deleting the loan.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: POST /admin/loans/:id/admin-review
 * Body: { approve: boolean, adminComment?: string }
 */
export async function adminReviewLoanController(req, res) {
  try {
    const { id } = req.params;
    const { approve, adminComment } = req.body;

    const loan = await adminReviewLoan(id, { approve, adminComment });

    return res.json({
      status: true,
      message: approve
        ? "Loan approved by admin and sent to guarantor"
        : "Loan rejected by admin",
      data: { loan },
    });
  } catch (err) {
    console.error("adminReviewLoanController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while processing admin loan review.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GUARANTOR: POST /loans/:id/guarantor-decision
 * Body: { approve: boolean }
 */
export async function guarantorDecisionController(req, res) {
  try {
    const { id } = req.params;
    const guarantorId = req.payload?.userId; // guarantor is logged-in user
    const { approve } = req.body;

    const loan = await guarantorDecision(id, guarantorId, { approve });

    return res.json({
      status: true,
      message: approve
        ? "Loan approved by guarantor and sent to borrower for confirmation"
        : "Loan rejected by guarantor",
      data: { loan },
    });
  } catch (err) {
    console.error("guarantorDecisionController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while processing guarantor decision.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * BORROWER: POST /loans/:id/confirm
 * Body: { confirm: boolean }
 */
export async function borrowerConfirmLoanController(req, res) {
  try {
    const { id } = req.params;
    const borrowerId = req.payload?.userId;
    const { confirm } = req.body;

    const loan = await borrowerConfirmLoan(id, borrowerId, { confirm });

    return res.json({
      status: true,
      message: confirm
        ? "Loan confirmed by borrower and approved for disbursement"
        : "Loan cancelled by borrower",
      data: { loan },
    });
  } catch (err) {
    console.error("borrowerConfirmLoanController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while processing borrower confirmation.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: POST /admin/loans/:id/disburse
 * No special body needed (unless you pass payment metadata later)
 */
export async function disburseLoanController(req, res) {
  try {
    const { id } = req.params;

    const loan = await disburseLoan(id);

    return res.json({
      status: true,
      message: "Loan disbursed and now ACTIVE",
      data: { loan },
    });
  } catch (err) {
    console.error("disburseLoanController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while disbursing the loan.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * BORROWER: POST /loans/:id/cancel
 * Cancels the loan BEFORE it is disbursed
 */
export async function cancelLoanByBorrowerController(req, res) {
  try {
    const { id } = req.params;
    const borrowerId = req.payload?.userId;

    // Optional: verify borrower is owner
    // We can reuse getLoanByIdService or just quickly check the doc:
    const { loan } = await getLoanByIdService(id);
    if (!loan || String(loan.borrowerId) !== String(borrowerId)) {
      return res.status(403).json({
        status: false,
        message: "You are not allowed to cancel this loan",
      });
    }

    const updatedLoan = await cancelLoan(id, { by: "BORROWER" });

    return res.json({
      status: true,
      message: "Loan cancelled by borrower",
      data: { loan: updatedLoan },
    });
  } catch (err) {
    console.error("cancelLoanByBorrowerController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while cancelling the loan.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: POST /admin/loans/:id/cancel
 */
export async function cancelLoanByAdminController(req, res) {
  try {
    const { id } = req.params;

    const loan = await cancelLoan(id, { by: "ADMIN" });

    return res.json({
      status: true,
      message: "Loan cancelled by admin",
      data: { loan },
    });
  } catch (err) {
    console.error("cancelLoanByAdminController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while cancelling the loan.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}
