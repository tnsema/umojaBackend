// services/contribution.service.js
// Business logic for member monthly contributions.

import Models from "../model/model.js";
import mongoose from "mongoose";

const {
  contribution: Contribution,
  user: User,
  walletTransaction: WalletTransaction,
} = Models;

const { isValidObjectId } = mongoose;

/**
 * createContribution({ memberId, month, year, amount, method?, walletTxId? })
 *
 * - Validates member exists (User)
 * - Ensures no duplicate for same member-month-year (schema unique index)
 * - Creates contribution with status PENDING by default
 */
export async function createContributionService({
  memberId,
  month,
  year,
  amount,
  method = "WALLET",
  walletTxId = null,
}) {
  if (!memberId || !month || !year || !amount) {
    const err = new Error("memberId, month, year and amount are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(memberId)) {
    const err = new Error("Invalid memberId");
    err.code = "INVALID_MEMBER_ID";
    throw err;
  }

  const member = await User.findById(memberId);
  if (!member) {
    const err = new Error("Member not found");
    err.code = "MEMBER_NOT_FOUND";
    throw err;
  }

  const monthNum = Number(month);
  const yearNum = Number(year);
  const amountNum = Number(amount);

  if (
    !Number.isInteger(monthNum) ||
    monthNum < 1 ||
    monthNum > 12 ||
    !Number.isInteger(yearNum)
  ) {
    const err = new Error("Invalid month or year");
    err.code = "INVALID_PERIOD";
    throw err;
  }

  if (isNaN(amountNum) || amountNum <= 0) {
    const err = new Error("Invalid contribution amount");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  if (!["WALLET", "POP"].includes(method)) {
    const err = new Error("Invalid contribution method");
    err.code = "INVALID_METHOD";
    throw err;
  }

  // Optional: validate walletTxId exists if provided
  if (walletTxId) {
    if (!isValidObjectId(walletTxId)) {
      const err = new Error("Invalid walletTxId");
      err.code = "INVALID_WALLET_TX_ID";
      throw err;
    }

    const tx = await WalletTransaction.findById(walletTxId);
    if (!tx) {
      const err = new Error("Wallet transaction not found");
      err.code = "WALLET_TX_NOT_FOUND";
      throw err;
    }
  }

  try {
    const contrib = await Contribution.create({
      memberId,
      month: monthNum,
      year: yearNum,
      amount: amountNum,
      method,
      status: "PENDING",
      walletTxId: walletTxId || undefined,
    });

    return contrib;
  } catch (err) {
    // Handle duplicate key (unique index on memberId+month+year)
    if (err.code === 11000) {
      const dupErr = new Error(
        "Contribution for this member, month and year already exists"
      );
      dupErr.code = "DUPLICATE_CONTRIBUTION";
      throw dupErr;
    }

    throw err;
  }
}

/**
 * markContributionPaid({ contributionId, walletTxId })
 *
 * - Sets status to PAID
 * - Links walletTxId (if given)
 */
export async function markContributionPaidService({
  contributionId,
  walletTxId,
}) {
  if (!contributionId) {
    const err = new Error("contributionId is required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(contributionId)) {
    const err = new Error("Invalid contributionId");
    err.code = "INVALID_CONTRIBUTION_ID";
    throw err;
  }

  const contrib = await Contribution.findById(contributionId);
  if (!contrib) {
    const err = new Error("Contribution not found");
    err.code = "CONTRIBUTION_NOT_FOUND";
    throw err;
  }

  if (walletTxId) {
    if (!isValidObjectId(walletTxId)) {
      const err = new Error("Invalid walletTxId");
      err.code = "INVALID_WALLET_TX_ID";
      throw err;
    }

    const tx = await WalletTransaction.findById(walletTxId);
    if (!tx) {
      const err = new Error("Wallet transaction not found");
      err.code = "WALLET_TX_NOT_FOUND";
      throw err;
    }

    contrib.walletTxId = walletTxId;
  }

  contrib.status = "PAID";
  await contrib.save();

  return contrib;
}

/**
 * listMemberContributions(memberId)
 */
export async function listMemberContributionsService(memberId) {
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

  const list = await Contribution.find({ memberId })
    .sort({ year: -1, month: -1 })
    .lean();

  return list;
}

/**
 * getContributionsByYear(year)
 */
export async function getContributionsByYearService(year) {
  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) {
    const err = new Error("Invalid year");
    err.code = "INVALID_YEAR";
    throw err;
  }

  const list = await Contribution.find({ year: yearNum })
    .sort({ memberId: 1, month: 1 })
    .lean();

  return list;
}

/**
 * getContributionsByMonth(month)
 *
 * NOTE: this returns all contributions for that month across all years.
 * If later you want a specific year + month, we can add another function.
 */
export async function getContributionsByMonthService(month) {
  const monthNum = Number(month);
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    const err = new Error("Invalid month");
    err.code = "INVALID_MONTH";
    throw err;
  }

  const list = await Contribution.find({ month: monthNum })
    .sort({ year: -1, memberId: 1 })
    .lean();

  return list;
}

/**
 * getContributionsByYearByMember(memberId, year)
 */
export async function getContributionsByYearByMemberService(memberId, year) {
  if (!memberId || !year) {
    const err = new Error("memberId and year are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(memberId)) {
    const err = new Error("Invalid memberId");
    err.code = "INVALID_MEMBER_ID";
    throw err;
  }

  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) {
    const err = new Error("Invalid year");
    err.code = "INVALID_YEAR";
    throw err;
  }

  const list = await Contribution.find({ memberId, year: yearNum })
    .sort({ month: 1 })
    .lean();

  return list;
}
