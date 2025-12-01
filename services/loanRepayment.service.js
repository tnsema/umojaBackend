// services/loanRepayment.service.js

import mongoose from "mongoose";
import Models from "../model/model.js";
import { createInvoice } from "./invoice.service.js";

const { loan: Loan, loanRepayment: LoanRepayment } = Models;
const { isValidObjectId } = mongoose;

/**
 * Generate repayment schedule for a loan.
 * E.g. totalInstallments = 3 → 3 LoanRepayment docs.
 *
 * You can adjust how principal/interest are split.
 */
export async function generateLoanRepaymentSchedule({
  loanId,
  totalInstallments,
  startDate,
  principalPerInstallment,
  interestPerInstallment,
}) {
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

  const docs = [];
  const baseDate = new Date(startDate || new Date());

  for (let i = 1; i <= totalInstallments; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));

    const principalAmount = Number(principalPerInstallment || 0);
    const interestAmount = Number(interestPerInstallment || 0);
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
  return repayments;
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
