// services/loan.service.js

import Models from "../model/model.js";
import mongoose from "mongoose";
import {
  getClientLoanInterestRate,
  getMemberLoanInterestRate,
  getDefaultPenaltyFee,
} from "./settings.service.js";
import { generateScheduleForLoan } from "./loanRepayment.service.js";

const {
  loan: Loan,
  loanCollateral: LoanCollateral,
  loanReference: LoanReference,
  repaymentPlan: RepaymentPlan,
} = Models;

const { isValidObjectId } = mongoose;

/**
 * Pure helper – calculate interest amount
 * Example: requestedAmount = 1000, interestRate = 20 => 200
 */
export function calculateInterest(requestedAmount, interestRate = 0) {
  const principal = Number(requestedAmount || 0);
  const rate = Number(interestRate || 0);
  if (principal <= 0 || rate <= 0) return 0;
  return (principal * rate) / 100;
}

/**
 * Pure helper – calculate total repayable
 * total = requestedAmount + interest + penaltyFees
 */
export function calculateTotalRepayable(
  requestedAmount,
  interestRate = 0,
  penaltyFees = 0
) {
  const interest = calculateInterest(requestedAmount, interestRate);
  const principal = Number(requestedAmount || 0);
  const penalties = Number(penaltyFees || 0);
  return principal + interest + penalties;
}

/**
 * Decide which interest rate to use based on roles array.
 * roles example: ["MEMBER", "ADMIN"] or ["CLIENT"]
 * Business rule:
 *  - if roles includes MEMBER → member rate
 *  - else if roles includes CLIENT → client rate
 *  - else fallback to client rate (or whatever you prefer)
 *  - MEMBER and CLIENT must not exist together in the same array
 */
async function resolveInterestRateFromRoles(roles = []) {
  const safeRoles = Array.isArray(roles) ? roles : [];

  const hasMember = safeRoles.includes("MEMBER");
  const hasClient = safeRoles.includes("CLIENT");

  if (hasMember && hasClient) {
    const err = new Error(
      "Invalid roles configuration: MEMBER and CLIENT cannot exist together"
    );
    err.statusCode = 400;
    throw err;
  }

  if (hasMember) {
    return await getMemberLoanInterestRate();
  }

  if (hasClient) {
    return await getClientLoanInterestRate();
  }

  // Fallback: treat as client (or change to 0 if you want no interest)
  return await getClientLoanInterestRate();
}

/**
 * Create a loan + optional collateral + references
 *
 * payload expected:
 * {
 *   borrowerId,          // from backend (logged in user)
 *   roles,               // array of roles, e.g. ["MEMBER", "ADMIN"]
 *   guarantorId,
 *   repaymentPlanId,
 *   requestedAmount,
 *   purpose?,
 *   adminComment?,
 *   collateral?: [{ category, type, description, estimatedValue }],
 *   references?: [{ firstName, lastName, phone, relation }]
 * }
 */
export async function createLoan(payload) {
  const {
    borrowerId,
    roles = [],
    guarantorId,
    repaymentPlanId,
    requestedAmount,
    purpose,
    adminComment,
    collateral = [],
    references = [],
  } = payload;

  if (!isValidObjectId(borrowerId)) {
    const err = new Error("Invalid borrower ID");
    err.statusCode = 400;
    throw err;
  }

  if (!isValidObjectId(guarantorId)) {
    const err = new Error("Invalid guarantor ID");
    err.statusCode = 400;
    throw err;
  }

  if (!isValidObjectId(repaymentPlanId)) {
    const err = new Error("Invalid repayment plan ID");
    err.statusCode = 400;
    throw err;
  }

  if (!requestedAmount || Number(requestedAmount) <= 0) {
    const err = new Error("Requested amount must be greater than zero");
    err.statusCode = 400;
    throw err;
  }

  // Ensure repayment plan exists and is active
  const plan = await RepaymentPlan.findOne({
    _id: repaymentPlanId,
    isActive: true,
  });
  if (!plan) {
    const err = new Error("Invalid or inactive repayment plan.");
    err.statusCode = 400;
    throw err;
  }

  // Get interest rate & penalty fees from SettingsService
  const interestRate = await resolveInterestRateFromRoles(roles);
  const penaltyFees = await getDefaultPenaltyFee();

  // BACKEND re-calculates interest + total
  const totalRepayable = calculateTotalRepayable(
    requestedAmount,
    interestRate,
    penaltyFees
  );

  const loan = await Loan.create({
    borrowerId,
    guarantorId,
    repaymentPlanId,
    requestedAmount,
    totalRepayable,
    interestRate,
    penaltyFees,
    purpose,
    adminComment,
    status: "PENDING_ADMIN_REVIEW",
  });

  // Collateral items (optional)
  if (Array.isArray(collateral) && collateral.length > 0) {
    const collateralDocs = collateral.map((item) => ({
      loanId: loan._id,
      category: item.category,
      type: item.type,
      description: item.description,
      estimatedValue: item.estimatedValue,
    }));
    await LoanCollateral.insertMany(collateralDocs);
  }

  // References (optional)
  if (Array.isArray(references) && references.length > 0) {
    const referenceDocs = references.map((ref) => ({
      loanId: loan._id,
      // NOTE: your schema uses "firstMame" – either fix schema or keep this:
      firstMame: ref.firstName,
      lastName: ref.lastName,
      phone: ref.phone,
      relation: ref.relation,
    }));
    await LoanReference.insertMany(referenceDocs);
  }

  return loan;
}

/**
 * Get a single loan by ID, with linked data
 */
export async function getLoanById(loanId) {
  if (!isValidObjectId(loanId)) {
    const err = new Error("Invalid loan ID");
    err.statusCode = 400;
    throw err;
  }

  const loan = await Loan.findById(loanId)
    .populate("borrowerId", "firstName lastName phone")
    .populate("guarantorId", "firstName lastName phone")
    .populate("repaymentPlanId");

  if (!loan) {
    const err = new Error("Loan not found");
    err.statusCode = 404;
    throw err;
  }

  const [collateral, references] = await Promise.all([
    LoanCollateral.find({ loanId: loan._id }),
    LoanReference.find({ loanId: loan._id }),
  ]);

  return { loan, collateral, references };
}

/**
 * Get loans for a specific user (borrower)
 */
export async function getUserLoans({
  borrowerId,
  page = 1,
  limit = 20,
  status,
}) {
  if (!isValidObjectId(borrowerId)) {
    const err = new Error("Invalid borrower ID");
    err.statusCode = 400;
    throw err;
  }

  const filter = { borrowerId };
  if (status) filter.status = status;

  page = Number(page) || 1;
  limit = Number(limit) || 20;
  const skip = (page - 1) * limit;

  const query = Loan.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("repaymentPlanId");

  const [items, total] = await Promise.all([
    query.exec(),
    Loan.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Get ALL loans (admin)
 */
export async function getAllLoans({
  page = 1,
  limit = 20,
  status,
  borrowerId,
  guarantorId,
}) {
  const filter = {};

  if (status) filter.status = status;
  if (borrowerId && isValidObjectId(borrowerId)) filter.borrowerId = borrowerId;
  if (guarantorId && isValidObjectId(guarantorId))
    filter.guarantorId = guarantorId;

  page = Number(page) || 1;
  limit = Number(limit) || 20;
  const skip = (page - 1) * limit;

  const query = Loan.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("borrowerId", "firstName lastName phone")
    .populate("guarantorId", "firstName lastName phone")
    .populate("repaymentPlanId");

  const [items, total] = await Promise.all([
    query.exec(),
    Loan.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Delete a loan and its linked collateral + references
 */
export async function deleteLoan(loanId) {
  if (!isValidObjectId(loanId)) {
    const err = new Error("Invalid loan ID");
    err.statusCode = 400;
    throw err;
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    const err = new Error("Loan not found");
    err.statusCode = 404;
    throw err;
  }

  await Promise.all([
    Loan.deleteOne({ _id: loanId }),
    LoanCollateral.deleteMany({ loanId }),
    LoanReference.deleteMany({ loanId }),
  ]);

  return { success: true };
}

/**
 * ADMIN: review loan
 * - From: PENDING_ADMIN_REVIEW
 * - To:   PENDING_GUARANTOR_APPROVAL (if approved)
 *       | REJECTED (if declined)
 */
export async function adminReviewLoan(loanId, { approve, adminComment }) {
  if (!isValidObjectId(loanId)) {
    const err = new Error("Invalid loan ID");
    err.statusCode = 400;
    throw err;
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    const err = new Error("Loan not found");
    err.statusCode = 404;
    throw err;
  }

  if (loan.status !== "PENDING_ADMIN_REVIEW") {
    const err = new Error("Loan is not awaiting admin review");
    err.statusCode = 400;
    throw err;
  }

  if (adminComment !== undefined) {
    loan.adminComment = adminComment;
  }

  if (!approve) {
    loan.status = "REJECTED";
  } else {
    loan.status = "PENDING_GUARANTOR_APPROVAL";
  }

  await loan.save();
  return loan;
}

/**
 * GUARANTOR: approve or decline loan
 * - From: PENDING_GUARANTOR_APPROVAL
 * - To:   PENDING_BORROWER_CONFIRMATION (if approved)
 *       | REJECTED (if declined)
 */
export async function guarantorDecision(loanId, guarantorId, { approve }) {
  if (!isValidObjectId(loanId)) {
    const err = new Error("Invalid loan ID");
    err.statusCode = 400;
    throw err;
  }

  if (!isValidObjectId(guarantorId)) {
    const err = new Error("Invalid guarantor ID");
    err.statusCode = 400;
    throw err;
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    const err = new Error("Loan not found");
    err.statusCode = 404;
    throw err;
  }

  if (String(loan.guarantorId) !== String(guarantorId)) {
    const err = new Error("You are not the guarantor for this loan");
    err.statusCode = 403;
    throw err;
  }

  if (loan.status !== "PENDING_GUARANTOR_APPROVAL") {
    const err = new Error("Loan is not awaiting guarantor approval");
    err.statusCode = 400;
    throw err;
  }

  if (!approve) {
    loan.status = "REJECTED";
  } else {
    loan.status = "PENDING_BORROWER_CONFIRMATION";
  }

  await loan.save();
  return loan;
}

/**
 * BORROWER: confirm or decline the loan offer
 * - From: PENDING_BORROWER_CONFIRMATION
 * - To:   APPROVED_FOR_DISBURSEMENT (if confirmed)
 *       | CANCELLED (if declined)
 */
export async function borrowerConfirmLoan(loanId, borrowerId, { confirm }) {
  if (!isValidObjectId(loanId)) {
    const err = new Error("Invalid loan ID");
    err.statusCode = 400;
    throw err;
  }

  if (!isValidObjectId(borrowerId)) {
    const err = new Error("Invalid borrower ID");
    err.statusCode = 400;
    throw err;
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    const err = new Error("Loan not found");
    err.statusCode = 404;
    throw err;
  }

  if (String(loan.borrowerId) !== String(borrowerId)) {
    const err = new Error("You are not the borrower for this loan");
    err.statusCode = 403;
    throw err;
  }

  if (loan.status !== "PENDING_BORROWER_CONFIRMATION") {
    const err = new Error("Loan is not awaiting borrower confirmation");
    err.statusCode = 400;
    throw err;
  }

  if (!confirm) {
    loan.status = "CANCELLED";
  } else {
    loan.status = "APPROVED_FOR_DISBURSEMENT";
  }

  await loan.save();
  return loan;
}

/**
 * ADMIN: disburse loan
 * - From: APPROVED_FOR_DISBURSEMENT
 * - To:   ACTIVE
 * (Here you would also trigger wallet crediting, etc.)
 *
 * When it becomes ACTIVE, we also:
 *  - set disbursedAt
 *  - auto-generate repayment schedule based on plan + loan amounts
 */
export async function disburseLoan(loanId) {
  if (!isValidObjectId(loanId)) {
    const err = new Error("Invalid loan ID");
    err.statusCode = 400;
    throw err;
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    const err = new Error("Loan not found");
    err.statusCode = 404;
    throw err;
  }

  if (loan.status !== "APPROVED_FOR_DISBURSEMENT") {
    const err = new Error("Loan is not approved for disbursement");
    err.statusCode = 400;
    throw err;
  }

  // TODO: integrate with wallet / payments system

  loan.status = "ACTIVE";
  loan.disbursedAt = loan.disbursedAt || new Date();

  await loan.save();

  // 🔥 Auto-generate repayment schedule based on this loan
  try {
    await generateScheduleForLoan(loan._id);
  } catch (scheduleErr) {
    console.error(
      "Failed to generate repayment schedule for loan:",
      loan._id,
      scheduleErr
    );
    // You can decide to throw here if schedule generation is critical
    // throw scheduleErr;
  }

  return loan;
}

/**
 * Cancel loan (before disbursement)
 * - Allowed statuses: PENDING_ADMIN_REVIEW, PENDING_GUARANTOR_APPROVAL,
 *   PENDING_BORROWER_CONFIRMATION, APPROVED_FOR_DISBURSEMENT
 * - Not allowed once ACTIVE/CLOSED/DEFAULTED
 *
 * `by` can be "BORROWER" or "ADMIN" (for logging / later audits if you want)
 */
export async function cancelLoan(loanId, { by }) {
  if (!isValidObjectId(loanId)) {
    const err = new Error("Invalid loan ID");
    err.statusCode = 400;
    throw err;
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    const err = new Error("Loan not found");
    err.statusCode = 404;
    throw err;
  }

  const notCancellableStatuses = ["ACTIVE", "CLOSED", "DEFAULTED", "CANCELLED"];

  if (notCancellableStatuses.includes(loan.status)) {
    const err = new Error("Loan cannot be cancelled at this stage");
    err.statusCode = 400;
    throw err;
  }

  loan.status = "CANCELLED";
  // Optional: could store `cancelledBy` field if you add it to schema
  // loan.cancelledBy = by;

  await loan.save();
  return loan;
}
