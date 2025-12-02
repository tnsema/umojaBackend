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

  if (!loan.repaymentPlanId) {
    const err = new Error("Loan has no repayment plan assigned");
    err.statusCode = 400;
    throw err;
  }

  const totalInstallments = loan.repaymentPlanId.numberOfMonths;
  if (!totalInstallments || totalInstallments <= 0) {
    const err = new Error("Invalid numberOfMonths on repayment plan");
    err.statusCode = 400;
    throw err;
  }

  console.log(
    "[generateScheduleForLoan] Generating schedule for loan:",
    loanId,
    "installments:",
    totalInstallments
  );

  // If you ever regenerate schedule, clean old ones
  await LoanRepayment.deleteMany({ loanId });

  const baseDate = loan.disbursedAt || new Date();

  const principalTotal = Number(loan.requestedAmount || 0);
  const penaltyTotal = Number(loan.penaltyFees || 0);
  const totalRepayable = Number(loan.totalRepayable || 0);

  const interestTotal = totalRepayable - principalTotal - penaltyTotal;

  const principalPerInstallment = principalTotal / totalInstallments;
  const interestPerInstallment = interestTotal / totalInstallments;

  const docs = [];

  for (let i = 1; i <= totalInstallments; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));

    const principalAmount = principalPerInstallment;
    const interestAmount = interestPerInstallment;
    const lateFeeAmount = 0;
    const totalAmount = principalAmount + interestAmount + lateFeeAmount;

    docs.push({
      loanId,
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

  const repayments = await LoanRepayment.insertMany(docs);

  console.log(
    "[generateScheduleForLoan] Created",
    repayments.length,
    "repayments for loan",
    loanId
  );

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
