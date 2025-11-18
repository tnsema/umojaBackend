// services/loan.service.js
// Business logic for loan lifecycle in Umoja.

import Models from "../model/model.js";
import mongoose from "mongoose";

const {
  loan: Loan,
  loanGuarantorDecision: LoanGuarantorDecision,
  user: User,
  wallet: Wallet,
  walletTransaction: WalletTransaction,
} = Models;

const { isValidObjectId } = mongoose;

// Small helper to normalise decisions
function normalizeDecision(decision) {
  return String(decision || "")
    .trim()
    .toUpperCase();
}

/**
 * requestLoan({ borrowerId, amount, purpose, termMonths, guarantorId, repaymentType?, interestRate?, fees? })
 *
 * - Creates a Loan with status PENDING_GUARANTOR
 * - Generates repayment schedule based on repaymentType / termMonths
 */
export async function requestLoanService({
  borrowerId,
  amount,
  purpose,
  termMonths,
  guarantorId,
  repaymentType = "MONTHLY", // or "ONCE_OFF"
  interestRate = 0,
  fees = 0,
}) {
  if (!borrowerId || !amount || !guarantorId) {
    const err = new Error("borrowerId, amount and guarantorId are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(borrowerId) || !isValidObjectId(guarantorId)) {
    const err = new Error("Invalid borrowerId or guarantorId");
    err.code = "INVALID_USER_ID";
    throw err;
  }

  if (String(borrowerId) === String(guarantorId)) {
    const err = new Error("Borrower and guarantor cannot be the same user");
    err.code = "SAME_USER";
    throw err;
  }

  const borrower = await User.findById(borrowerId);
  if (!borrower) {
    const err = new Error("Borrower not found");
    err.code = "BORROWER_NOT_FOUND";
    throw err;
  }

  const guarantor = await User.findById(guarantorId);
  if (!guarantor) {
    const err = new Error("Guarantor not found");
    err.code = "GUARANTOR_NOT_FOUND";
    throw err;
  }

  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    const err = new Error("Invalid loan amount");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  const term = Number(termMonths || 0);
  const normalizedRepaymentType = String(repaymentType).trim().toUpperCase();
  if (!["ONCE_OFF", "MONTHLY"].includes(normalizedRepaymentType)) {
    const err = new Error("Invalid repaymentType");
    err.code = "INVALID_REPAYMENT_TYPE";
    throw err;
  }

  if (normalizedRepaymentType === "MONTHLY" && (!term || term <= 0)) {
    const err = new Error("termMonths must be > 0 for MONTHLY repayment");
    err.code = "INVALID_TERM";
    throw err;
  }

  const loan = new Loan({
    borrowerId,
    guarantorId,
    amount: amt,
    purpose: purpose || "",
    status: "PENDING_GUARANTOR",
    repaymentType: normalizedRepaymentType,
    interestRate: Number(interestRate || 0),
    fees: Number(fees || 0),
    durationMonths: normalizedRepaymentType === "MONTHLY" ? term : undefined,
    startDate: new Date(),
  });

  // Generate schedule using loan's own method
  loan.generateSchedule();
  await loan.save();

  return loan;
}

/**
 * guarantorDecision({ loanId, guarantorId, decision, comment? })
 *
 * - Only loan.guarantorId may call this
 * - Creates a LoanGuarantorDecision record
 * - Updates Loan status to:
 *   - APPROVE -> PENDING_ADMIN
 *   - REJECT  -> REJECTED
 */
export async function guarantorDecisionService({
  loanId,
  guarantorId,
  decision,
  comment,
}) {
  if (!loanId || !guarantorId || !decision) {
    const err = new Error("loanId, guarantorId and decision are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(loanId) || !isValidObjectId(guarantorId)) {
    const err = new Error("Invalid loanId or guarantorId");
    err.code = "INVALID_ID";
    throw err;
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    const err = new Error("Loan not found");
    err.code = "LOAN_NOT_FOUND";
    throw err;
  }

  if (String(loan.guarantorId) !== String(guarantorId)) {
    const err = new Error("Not the guarantor for this loan");
    err.code = "NOT_GUARANTOR";
    throw err;
  }

  if (loan.status !== "PENDING_GUARANTOR") {
    const err = new Error("Loan is not awaiting guarantor decision");
    err.code = "INVALID_STATUS";
    throw err;
  }

  const normalizedDecision = normalizeDecision(decision);
  if (!["APPROVE", "REJECT"].includes(normalizedDecision)) {
    const err = new Error("Decision must be APPROVE or REJECT");
    err.code = "INVALID_DECISION";
    throw err;
  }

  await LoanGuarantorDecision.create({
    loanId: loan._id,
    guarantorId,
    decision: normalizedDecision,
    comment: comment || "",
    decidedAt: new Date(),
  });

  if (normalizedDecision === "APPROVE") {
    loan.status = "PENDING_ADMIN";
  } else {
    loan.status = "REJECTED";
    loan.closedAt = new Date();
  }

  await loan.save();

  return loan;
}

/**
 * adminReviewLoan({ loanId, adminId, decision, comment? })
 *
 * - Only when loan.status === PENDING_ADMIN
 * - APPROVE: status -> APPROVED + approvedAt
 * - REJECT:  status -> REJECTED + closedAt + adminComment
 */
export async function adminReviewLoanService({
  loanId,
  adminId,
  decision,
  comment,
}) {
  if (!loanId || !adminId || !decision) {
    const err = new Error("loanId, adminId and decision are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(loanId) || !isValidObjectId(adminId)) {
    const err = new Error("Invalid loanId or adminId");
    err.code = "INVALID_ID";
    throw err;
  }

  const admin = await User.findById(adminId);
  if (!admin) {
    const err = new Error("Admin not found");
    err.code = "ADMIN_NOT_FOUND";
    throw err;
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    const err = new Error("Loan not found");
    err.code = "LOAN_NOT_FOUND";
    throw err;
  }

  if (loan.status !== "PENDING_ADMIN") {
    const err = new Error("Loan is not pending admin review");
    err.code = "INVALID_STATUS";
    throw err;
  }

  const normalizedDecision = normalizeDecision(decision);
  if (!["APPROVE", "REJECT"].includes(normalizedDecision)) {
    const err = new Error("Decision must be APPROVE or REJECT");
    err.code = "INVALID_DECISION";
    throw err;
  }

  if (normalizedDecision === "APPROVE") {
    loan.status = "APPROVED";
    loan.approvedAt = new Date();
  } else {
    loan.status = "REJECTED";
    loan.closedAt = new Date();
  }

  loan.adminComment = comment || "";
  await loan.save();

  return loan;
}

/**
 * borrowerConfirmAcceptance({ loanId, borrowerId })
 *
 * For now:
 * - checks borrower + status === APPROVED
 * - does not change status (that is done on disburseLoan)
 * - Optionally we can append info to adminComment.
 */
export async function borrowerConfirmAcceptanceService({ loanId, borrowerId }) {
  if (!loanId || !borrowerId) {
    const err = new Error("loanId and borrowerId are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(loanId) || !isValidObjectId(borrowerId)) {
    const err = new Error("Invalid loanId or borrowerId");
    err.code = "INVALID_ID";
    throw err;
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    const err = new Error("Loan not found");
    err.code = "LOAN_NOT_FOUND";
    throw err;
  }

  if (String(loan.borrowerId) !== String(borrowerId)) {
    const err = new Error("Not the borrower for this loan");
    err.code = "NOT_BORROWER";
    throw err;
  }

  if (loan.status !== "APPROVED") {
    const err = new Error("Loan is not approved yet");
    err.code = "INVALID_STATUS";
    throw err;
  }

  // Just annotate in adminComment
  const timestamp = new Date().toISOString();
  const note = `[BORROWER_ACCEPTED_AT=${timestamp}]`;
  loan.adminComment = loan.adminComment
    ? `${loan.adminComment}\n${note}`
    : note;
  await loan.save();

  return loan;
}

/**
 * disburseLoan({ loanId, adminId })
 *
 * - status must be APPROVED
 * - credits borrower's wallet with LOAN_DISBURSEMENT
 * - sets loan.status = ACTIVE, disbursedAt = now
 */
export async function disburseLoanService({ loanId, adminId }) {
  if (!loanId || !adminId) {
    const err = new Error("loanId and adminId are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(loanId) || !isValidObjectId(adminId)) {
    const err = new Error("Invalid loanId or adminId");
    err.code = "INVALID_ID";
    throw err;
  }

  const admin = await User.findById(adminId);
  if (!admin) {
    const err = new Error("Admin not found");
    err.code = "ADMIN_NOT_FOUND";
    throw err;
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    const err = new Error("Loan not found");
    err.code = "LOAN_NOT_FOUND";
    throw err;
  }

  if (loan.status !== "APPROVED") {
    const err = new Error("Loan is not approved for disbursement");
    err.code = "INVALID_STATUS";
    throw err;
  }

  // Find or create borrower's wallet
  let wallet = await Wallet.findOne({ userId: loan.borrowerId });
  if (!wallet) {
    wallet = await Wallet.create({
      userId: loan.borrowerId,
      balance: 0,
      currency: "ZAR",
    });
  }

  const disburseAmount = loan.amount;

  // Credit wallet
  wallet.balance += disburseAmount;
  await wallet.save();

  const tx = await WalletTransaction.create({
    walletId: wallet._id,
    type: "LOAN_DISBURSEMENT",
    amount: disburseAmount,
    reference: `LOAN-${loan._id}`,
    status: "CONFIRMED",
    createdBy: adminId,
    verifiedBy: adminId,
    verifiedAt: new Date(),
  });

  loan.status = "ACTIVE";
  loan.disbursedAt = new Date();
  await loan.save();

  return { loan, wallet, transaction: tx };
}

/**
 * repayLoan({ loanId, payerId, amount })
 *
 * - Payer must be borrower (for now)
 * - Loan must be ACTIVE
 * - Debits borrower's wallet (LOAN_REPAYMENT)
 * - Applies payment to repaymentSchedule
 */
export async function repayLoanService({ loanId, payerId, amount }) {
  if (!loanId || !payerId || !amount) {
    const err = new Error("loanId, payerId and amount are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(loanId) || !isValidObjectId(payerId)) {
    const err = new Error("Invalid loanId or payerId");
    err.code = "INVALID_ID";
    throw err;
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    const err = new Error("Loan not found");
    err.code = "LOAN_NOT_FOUND";
    throw err;
  }

  if (String(loan.borrowerId) !== String(payerId)) {
    const err = new Error("Only the borrower can repay this loan");
    err.code = "NOT_BORROWER";
    throw err;
  }

  if (loan.status !== "ACTIVE") {
    const err = new Error("Loan is not active");
    err.code = "INVALID_STATUS";
    throw err;
  }

  const payAmount = Number(amount);
  if (isNaN(payAmount) || payAmount <= 0) {
    const err = new Error("Invalid repayment amount");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  // Wallet
  const wallet = await Wallet.findOne({ userId: payerId });
  if (!wallet) {
    const err = new Error("Borrower wallet not found");
    err.code = "WALLET_NOT_FOUND";
    throw err;
  }

  if (wallet.balance < payAmount) {
    const err = new Error("Insufficient wallet balance");
    err.code = "INSUFFICIENT_FUNDS";
    throw err;
  }

  // Debit wallet
  wallet.balance -= payAmount;
  await wallet.save();

  const tx = await WalletTransaction.create({
    walletId: wallet._id,
    type: "LOAN_REPAYMENT",
    amount: payAmount,
    reference: `LOAN-REPAY-${loan._id}`,
    status: "CONFIRMED",
    createdBy: payerId,
    verifiedBy: payerId,
    verifiedAt: new Date(),
  });

  // Apply to schedule (simple allocation: earliest PENDING)
  let remaining = payAmount;

  const schedule = loan.repaymentSchedule || [];
  for (const entry of schedule) {
    if (remaining <= 0) break;
    if (entry.status !== "PENDING") continue;

    const due = entry.totalAmount;

    if (remaining >= due) {
      remaining -= due;
      entry.status = "PAID";
      entry.paidTxId = tx._id;
    } else {
      // Partially paid? For now, we mark as PENDING and just reduce totalAmount/ principal.
      // You can refine this later.
      entry.totalAmount = due - remaining;
      remaining = 0;
    }
  }

  loan.repaymentSchedule = schedule;

  // If all entries are PAID, close loan
  const allPaid =
    schedule.length > 0 && schedule.every((e) => e.status === "PAID");
  if (allPaid) {
    loan.status = "CLOSED";
    loan.closedAt = new Date();
  }

  await loan.save();

  return { loan, wallet, transaction: tx };
}

/**
 * cancelLoan({ loanId, actorId, reason })
 *
 * - Borrower or Admin may cancel, but only if not ACTIVE/CLOSED/DEFAULTED.
 * - Sets status = REJECTED and closedAt
 */
export async function cancelLoanService({ loanId, actorId, reason }) {
  if (!loanId || !actorId || !reason) {
    const err = new Error("loanId, actorId and reason are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(loanId) || !isValidObjectId(actorId)) {
    const err = new Error("Invalid loanId or actorId");
    err.code = "INVALID_ID";
    throw err;
  }

  const actor = await User.findById(actorId);
  if (!actor) {
    const err = new Error("Actor user not found");
    err.code = "ACTOR_NOT_FOUND";
    throw err;
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    const err = new Error("Loan not found");
    err.code = "LOAN_NOT_FOUND";
    throw err;
  }

  const forbiddenStatuses = ["ACTIVE", "CLOSED", "DEFAULTED"];
  if (forbiddenStatuses.includes(loan.status)) {
    const err = new Error(
      "Cannot cancel a loan that is ACTIVE, CLOSED, or DEFAULTED"
    );
    err.code = "INVALID_STATUS";
    throw err;
  }

  // Check actor is borrower or has ADMIN role (leave role check for route-level if you prefer)
  // Here we just allow anyone; route-level will usually restrict.

  loan.status = "REJECTED";
  loan.adminComment = `Cancelled by ${actorId}: ${reason}`;
  loan.closedAt = new Date();
  await loan.save();

  return loan;
}

/**
 * getLoansAgreedByMember(memberId)
 *
 * - Loans where this member acted as guarantor and APPROVED
 *   (based on LoanGuarantorDecision)
 */
export async function getLoansAgreedByMemberService(memberId) {
  if (!memberId) {
    const err = new Error("memberId is required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(memberId)) {
    const err = new Error("Invalid memberId");
    err.code = "INVALID_MEMBER_ID";
    throw err;
  }

  const decisions = await LoanGuarantorDecision.find({
    guarantorId: memberId,
    decision: "APPROVE",
  }).lean();

  const loanIds = decisions.map((d) => d.loanId);

  const loans = await Loan.find({ _id: { $in: loanIds } })
    .populate("borrowerId guarantorId")
    .sort({ requestedAt: -1 })
    .lean();

  return loans;
}

/**
 * listAllLoans()
 */
export async function listAllLoansService() {
  const loans = await Loan.find()
    .populate("borrowerId guarantorId")
    .sort({ createdAt: -1 })
    .lean();

  return loans;
}
