// services/loanRepayment.service.js

import mongoose from "mongoose";
import Models from "../model/model.js";
import { createInvoice } from "./invoice.service.js";

const { loan: Loan, loanRepayment: LoanRepayment } = Models;
const { isValidObjectId } = mongoose;

/**
 * NEW: Generate repayment schedule for a loan, using only backend data:
 *
 * - totalInstallments: from loan.repaymentPlanId.numberOfMonths
 * - startDate:         from loan.disbursedAt (or now if missing)
 * - principal:         from loan.requestedAmount
 * - interest:          from (loan.totalRepayable - requestedAmount - penaltyFees)
 *
 * Creates N LoanRepayment docs with:
 *  - installmentNumber (1..N)
 *  - totalInstallments
 *  - dueDate (month by month)
 *  - principalAmount / interestAmount / lateFeeAmount / totalAmount
 *  - status = PENDING
 */
export async function generateScheduleForLoan(loanId) {
  if (!isValidObjectId(loanId)) {
    const err = new Error("Invalid loan ID");
    err.statusCode = 400;
    throw err;
  }

  const loan = await Loan.findById(loanId).populate("repaymentPlanId");
  if (!loan) {
    const err = new Error("Loan not found");
    err.statusCode = 404;
    throw err;
  }

  const plan = loan.repaymentPlanId;
  if (!plan || !plan.numberOfMonths) {
    const err = new Error("Loan has no valid repayment plan attached");
    err.statusCode = 400;
    throw err;
  }

  const totalInstallments = plan.numberOfMonths;

  // Base date for 1st installment
  const baseDate = loan.disbursedAt ? new Date(loan.disbursedAt) : new Date();

  const totalPrincipal = Number(loan.requestedAmount || 0);
  const totalRepayable = Number(loan.totalRepayable || 0);
  const totalPenalties = Number(loan.penaltyFees || 0);

  // Total interest = everything above (principal + penalties)
  const totalInterest = Math.max(
    totalRepayable - totalPrincipal - totalPenalties,
    0
  );

  // Split principal & interest across installments
  const principalPerInstallmentRaw = totalPrincipal / totalInstallments;
  const interestPerInstallmentRaw = totalInterest / totalInstallments;

  const docs = [];
  let principalAccum = 0;
  let interestAccum = 0;

  for (let i = 1; i <= totalInstallments; i++) {
    // Equal-ish split, adjust last installment for rounding
    let principalAmount =
      i < totalInstallments
        ? Number(principalPerInstallmentRaw.toFixed(2))
        : Number((totalPrincipal - principalAccum).toFixed(2));

    let interestAmount =
      i < totalInstallments
        ? Number(interestPerInstallmentRaw.toFixed(2))
        : Number((totalInterest - interestAccum).toFixed(2));

    principalAccum += principalAmount;
    interestAccum += interestAmount;

    const dueDate = new Date(baseDate);
    // month by month: 1st = base, 2nd = +1 month, etc.
    dueDate.setMonth(dueDate.getMonth() + (i - 1));

    const lateFeeAmount = 0;
    const totalAmount = principalAmount + interestAmount + lateFeeAmount;

    docs.push({
      loanId: loan._id,
      installmentNumber: i,
      totalInstallments,
      dueDate,
      principalAmount,
      interestAmount,
      lateFeeAmount,
      totalAmount,
      status: "PENDING",
    });
  }

  // Optional: clear old schedule if regenerating
  await LoanRepayment.deleteMany({ loanId: loan._id });

  const repayments = await LoanRepayment.insertMany(docs);
  return repayments;
}

/**
 * LEGACY / COMPAT WRAPPER:
 * If something still calls generateLoanRepaymentSchedule({...}),
 * we now just use loanId and ignore the extra fields
 */
export async function generateLoanRepaymentSchedule({
  loanId,
  // other fields are ignored now, everything comes from DB:
  // totalInstallments,
  // startDate,
  // principalPerInstallment,
  // interestPerInstallment,
}) {
  return generateScheduleForLoan(loanId);
}

/**
 * Create an invoice for an existing LoanRepayment.
 * This can be used for the first slip or for re-issuing after changes.
 */
export async function createInvoiceForRepayment({
  repaymentId,
  userId,
  loanRef,
}) {
  if (!isValidObjectId(repaymentId)) {
    const err = new Error("Invalid repayment ID");
    err.statusCode = 400;
    throw err;
  }
  if (!isValidObjectId(userId)) {
    const err = new Error("Invalid user ID");
    err.statusCode = 400;
    throw err;
  }

  const repayment = await LoanRepayment.findById(repaymentId).populate(
    "loanId"
  );
  if (!repayment) {
    const err = new Error("Loan repayment not found");
    err.statusCode = 404;
    throw err;
  }

  const loan = repayment.loanId;

  const invoice = await createInvoice({
    userId,
    type: "LOAN_REPAYMENT",
    reference: loanRef || (loan && loan.loanRef) || String(loan?._id || ""),
    principalAmount: repayment.principalAmount,
    // you can decide whether to include lateFee in interestAmount or keep separate
    interestAmount: repayment.interestAmount + repayment.lateFeeAmount,
    totalAmount: repayment.totalAmount,
    dueDate: repayment.dueDate,
    currency: "ZAR",
    note: `Installment ${repayment.installmentNumber} of ${repayment.totalInstallments}`,
    metadata: {
      loanId: loan ? loan._id : null,
      repaymentId: repayment._id,
      installmentNumber: repayment.installmentNumber,
      totalInstallments: repayment.totalInstallments,
      lateFeeAmount: repayment.lateFeeAmount,
    },
  });

  repayment.invoiceIds = repayment.invoiceIds || [];
  repayment.invoiceIds.push(invoice._id);
  repayment.lastInvoiceId = invoice._id;
  await repayment.save();

  return { repayment, invoice };
}

/**
 * Mark a repayment as LATE, add late fee, recalc total,
 * and generate a NEW invoice.
 */
export async function markRepaymentLateAndGenerateInvoice({
  repaymentId,
  userId,
  lateFeeAmount,
}) {
  if (!isValidObjectId(repaymentId)) {
    const err = new Error("Invalid repayment ID");
    err.statusCode = 400;
    throw err;
  }
  if (!isValidObjectId(userId)) {
    const err = new Error("Invalid user ID");
    err.statusCode = 400;
    throw err;
  }

  const repayment = await LoanRepayment.findById(repaymentId).populate(
    "loanId"
  );
  if (!repayment) {
    const err = new Error("Loan repayment not found");
    err.statusCode = 404;
    throw err;
  }

  // 1) mark as late and update amounts
  repayment.status = "LATE";
  repayment.lateFeeAmount =
    Number(repayment.lateFeeAmount || 0) + Number(lateFeeAmount || 0);
  repayment.recalculateTotal();
  await repayment.save();

  const loan = repayment.loanId;

  // 2) create NEW invoice for this repayment with late fee included
  const invoice = await createInvoice({
    userId,
    type: "LOAN_REPAYMENT",
    reference: (loan && loan.loanRef) || String(loan?._id || ""),
    principalAmount: repayment.principalAmount,
    interestAmount: repayment.interestAmount + repayment.lateFeeAmount,
    totalAmount: repayment.totalAmount,
    dueDate: repayment.dueDate,
    currency: "ZAR",
    note: `Updated slip for installment ${repayment.installmentNumber} of ${repayment.totalInstallments} (late)`,
    metadata: {
      loanId: loan ? loan._id : null,
      repaymentId: repayment._id,
      installmentNumber: repayment.installmentNumber,
      totalInstallments: repayment.totalInstallments,
      lateFeeAmount: repayment.lateFeeAmount,
    },
  });

  repayment.invoiceIds = repayment.invoiceIds || [];
  repayment.invoiceIds.push(invoice._id);
  repayment.lastInvoiceId = invoice._id;
  await repayment.save();

  return { repayment, invoice };
}

/**
 * Helper to get all repayments for a loan (for UI).
 */
export async function getRepaymentsForLoan(loanId) {
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

  const repayments = await LoanRepayment.find({ loanId })
    .sort({ installmentNumber: 1 })
    .populate("lastInvoiceId", "invoiceNumber totalAmount dueDate type");

  return { loan, repayments };
}
