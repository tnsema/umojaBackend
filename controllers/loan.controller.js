// controllers/loan.controller.js

import {
  requestLoanService,
  guarantorDecisionService,
  adminReviewLoanService,
  borrowerConfirmAcceptanceService,
  disburseLoanService,
  repayLoanService,
  cancelLoanService,
  getLoansAgreedByMemberService,
  listAllLoansService,
} from "../services/loan.service.js";

/**
 * POST /loans/request
 * Body (form-data):
 *  - amount
 *  - purpose
 *  - termMonths
 *  - guarantorId
 *  - repaymentType? ("ONCE_OFF" | "MONTHLY")
 *  - interestRate? (number)
 *  - fees? (number)
 *
 * Auth: jwtVerify (borrower)
 */
export async function requestLoan(req, res) {
  try {
    const borrowerId = req.payload?.userId || req.body.borrowerId;
    const {
      amount,
      purpose,
      termMonths,
      guarantorId,
      repaymentType,
      interestRate,
      fees,
    } = req.body || {};

    const loan = await requestLoanService({
      borrowerId,
      amount,
      purpose,
      termMonths,
      guarantorId,
      repaymentType,
      interestRate,
      fees,
    });

    return res.status(201).json({
      status: true,
      message: "Loan request submitted successfully",
      data: loan,
    });
  } catch (err) {
    console.error("Error in requestLoan:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "borrowerId, amount and guarantorId are required",
      });
    }

    if (err.code === "INVALID_USER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid borrowerId or guarantorId",
      });
    }

    if (err.code === "SAME_USER") {
      return res.status(400).json({
        status: false,
        message: "Borrower and guarantor cannot be the same user",
      });
    }

    if (
      err.code === "BORROWER_NOT_FOUND" ||
      err.code === "GUARANTOR_NOT_FOUND"
    ) {
      return res.status(404).json({
        status: false,
        message: err.message,
      });
    }

    if (err.code === "INVALID_AMOUNT") {
      return res.status(400).json({
        status: false,
        message: "Invalid loan amount",
      });
    }

    if (err.code === "INVALID_REPAYMENT_TYPE") {
      return res.status(400).json({
        status: false,
        message: "Invalid repayment type",
      });
    }

    if (err.code === "INVALID_TERM") {
      return res.status(400).json({
        status: false,
        message: "termMonths must be greater than 0 for MONTHLY repayment",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while requesting loan",
    });
  }
}

/**
 * POST /loans/:loanId/guarantor-decision
 * Body (form-data):
 *  - decision ("APPROVE" | "REJECT")
 *  - comment? (optional)
 *
 * Auth: jwtVerify + requireRole("MEMBER" or "CLIENT") at route level
 */
export async function guarantorDecision(req, res) {
  try {
    const guarantorId = req.payload?.userId;
    const { loanId } = req.params;
    const { decision, comment } = req.body || {};

    const loan = await guarantorDecisionService({
      loanId,
      guarantorId,
      decision,
      comment,
    });

    return res.status(200).json({
      status: true,
      message: "Guarantor decision recorded successfully",
      data: loan,
    });
  } catch (err) {
    console.error("Error in guarantorDecision:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "loanId, guarantorId and decision are required",
      });
    }

    if (err.code === "INVALID_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid loanId or guarantorId",
      });
    }

    if (err.code === "LOAN_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Loan not found",
      });
    }

    if (err.code === "NOT_GUARANTOR") {
      return res.status(403).json({
        status: false,
        message: "You are not the guarantor for this loan",
      });
    }

    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({
        status: false,
        message: "Loan is not awaiting guarantor decision",
      });
    }

    if (err.code === "INVALID_DECISION") {
      return res.status(400).json({
        status: false,
        message: "Decision must be APPROVE or REJECT",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while recording guarantor decision",
    });
  }
}

/**
 * POST /loans/:loanId/admin-review
 * Body (form-data):
 *  - decision ("APPROVE" | "REJECT")
 *  - comment? (optional)
 *
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function adminReviewLoan(req, res) {
  try {
    const adminId = req.payload?.userId;
    const { loanId } = req.params;
    const { decision, comment } = req.body || {};

    const loan = await adminReviewLoanService({
      loanId,
      adminId,
      decision,
      comment,
    });

    return res.status(200).json({
      status: true,
      message: "Loan reviewed successfully",
      data: loan,
    });
  } catch (err) {
    console.error("Error in adminReviewLoan:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "loanId, adminId and decision are required",
      });
    }

    if (err.code === "INVALID_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid loanId or adminId",
      });
    }

    if (err.code === "ADMIN_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Admin not found",
      });
    }

    if (err.code === "LOAN_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Loan not found",
      });
    }

    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({
        status: false,
        message: "Loan is not pending admin review",
      });
    }

    if (err.code === "INVALID_DECISION") {
      return res.status(400).json({
        status: false,
        message: "Decision must be APPROVE or REJECT",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while reviewing loan",
    });
  }
}

/**
 * POST /loans/:loanId/confirm-acceptance
 * Auth: jwtVerify (borrower)
 */
export async function borrowerConfirmAcceptance(req, res) {
  try {
    const borrowerId = req.payload?.userId;
    const { loanId } = req.params;

    const loan = await borrowerConfirmAcceptanceService({
      loanId,
      borrowerId,
    });

    return res.status(200).json({
      status: true,
      message: "Borrower acceptance recorded",
      data: loan,
    });
  } catch (err) {
    console.error("Error in borrowerConfirmAcceptance:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "loanId and borrowerId are required",
      });
    }

    if (err.code === "INVALID_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid loanId or borrowerId",
      });
    }

    if (err.code === "LOAN_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Loan not found",
      });
    }

    if (err.code === "NOT_BORROWER") {
      return res.status(403).json({
        status: false,
        message: "You are not the borrower for this loan",
      });
    }

    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({
        status: false,
        message: "Loan is not approved yet",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while confirming acceptance",
    });
  }
}

/**
 * POST /loans/:loanId/disburse
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function disburseLoan(req, res) {
  try {
    const adminId = req.payload?.userId;
    const { loanId } = req.params;

    const result = await disburseLoanService({ loanId, adminId });

    return res.status(200).json({
      status: true,
      message: "Loan disbursed successfully",
      data: result,
    });
  } catch (err) {
    console.error("Error in disburseLoan:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "loanId and adminId are required",
      });
    }

    if (err.code === "INVALID_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid loanId or adminId",
      });
    }

    if (err.code === "ADMIN_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Admin not found",
      });
    }

    if (err.code === "LOAN_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Loan not found",
      });
    }

    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({
        status: false,
        message: "Loan is not approved for disbursement",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while disbursing loan",
    });
  }
}

/**
 * POST /loans/:loanId/repay
 * Body (form-data):
 *  - amount
 *
 * Auth: jwtVerify (borrower)
 */
export async function repayLoan(req, res) {
  try {
    const payerId = req.payload?.userId;
    const { loanId } = req.params;
    const { amount } = req.body || {};

    const result = await repayLoanService({ loanId, payerId, amount });

    return res.status(200).json({
      status: true,
      message: "Loan repayment successful",
      data: result,
    });
  } catch (err) {
    console.error("Error in repayLoan:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "loanId, payerId and amount are required",
      });
    }

    if (err.code === "INVALID_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid loanId or payerId",
      });
    }

    if (err.code === "LOAN_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Loan not found",
      });
    }

    if (err.code === "NOT_BORROWER") {
      return res.status(403).json({
        status: false,
        message: "Only the borrower can repay this loan",
      });
    }

    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({
        status: false,
        message: "Loan is not active",
      });
    }

    if (err.code === "INVALID_AMOUNT") {
      return res.status(400).json({
        status: false,
        message: "Invalid repayment amount",
      });
    }

    if (err.code === "WALLET_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Borrower wallet not found",
      });
    }

    if (err.code === "INSUFFICIENT_FUNDS") {
      return res.status(400).json({
        status: false,
        message: "Insufficient wallet balance",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while repaying loan",
    });
  }
}

/**
 * POST /loans/:loanId/cancel
 * Body (form-data):
 *  - reason
 *
 * Auth: jwtVerify (borrower or admin – enforce via route-level if needed)
 */
export async function cancelLoan(req, res) {
  try {
    const actorId = req.payload?.userId;
    const { loanId } = req.params;
    const { reason } = req.body || {};

    const loan = await cancelLoanService({ loanId, actorId, reason });

    return res.status(200).json({
      status: true,
      message: "Loan cancelled successfully",
      data: loan,
    });
  } catch (err) {
    console.error("Error in cancelLoan:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "loanId, actorId and reason are required",
      });
    }

    if (err.code === "INVALID_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid loanId or actorId",
      });
    }

    if (err.code === "ACTOR_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Actor user not found",
      });
    }

    if (err.code === "LOAN_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Loan not found",
      });
    }

    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({
        status: false,
        message: "Cannot cancel a loan that is ACTIVE, CLOSED, or DEFAULTED",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while cancelling loan",
    });
  }
}

/**
 * GET /loans/guarantor/me
 * Auth: jwtVerify
 */
export async function getLoansAgreedByMe(req, res) {
  try {
    const memberId = req.payload?.userId;

    const loans = await getLoansAgreedByMemberService(memberId);

    return res.status(200).json({
      status: true,
      data: loans,
    });
  } catch (err) {
    console.error("Error in getLoansAgreedByMe:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "memberId is required",
      });
    }

    if (err.code === "INVALID_MEMBER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid memberId",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching loans agreed by member",
    });
  }
}

/**
 * GET /loans/guarantor/:memberId
 * Auth: jwtVerify + requireRole("ADMIN") (or same user)
 */
export async function getLoansAgreedByMember(req, res) {
  try {
    const { memberId } = req.params;

    const loans = await getLoansAgreedByMemberService(memberId);

    return res.status(200).json({
      status: true,
      data: loans,
    });
  } catch (err) {
    console.error("Error in getLoansAgreedByMember:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "memberId is required",
      });
    }

    if (err.code === "INVALID_MEMBER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid memberId",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching loans agreed by member",
    });
  }
}

/**
 * GET /loans
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function listAllLoans(req, res) {
  try {
    const loans = await listAllLoansService();

    return res.status(200).json({
      status: true,
      data: loans,
    });
  } catch (err) {
    console.error("Error in listAllLoans:", err);

    return res.status(500).json({
      status: false,
      message: "Server error while listing loans",
    });
  }
}
