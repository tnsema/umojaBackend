// services/contribution.service.js

import mongoose from "mongoose";
import Models from "../model/model.js";
import { getAllMemberUsers } from "./user.service.js";

const { contribution: Contribution, user: User } = Models;
const { isValidObjectId } = mongoose;

function generateContributionReference() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const randomDigits = Math.floor(10000 + Math.random() * 90000);

  return `C${yy}${mm}${dd}${randomDigits}`;
}

/**
 * Create a contribution record
 * payload: { memberId, amount, month, year }
 */
export async function createContribution(payload) {
  const { memberId, amount, month, year } = payload;

  if (!isValidObjectId(memberId)) {
    const err = new Error("Invalid member ID");
    err.statusCode = 400;
    throw err;
  }

  if (!amount || Number(amount) <= 0) {
    const err = new Error("Amount must be greater than zero");
    err.statusCode = 400;
    throw err;
  }

  const monthNum = Number(month);
  const yearNum = Number(year);

  if (!monthNum || monthNum < 1 || monthNum > 12) {
    const err = new Error("Month must be between 1 and 12");
    err.statusCode = 400;
    throw err;
  }

  if (!yearNum || yearNum < 2000) {
    const err = new Error("Year is required and must be >= 2000");
    err.statusCode = 400;
    throw err;
  }

  // Optional: ensure user exists
  const userExists = await User.findById(memberId).lean();
  if (!userExists) {
    const err = new Error("Member user not found");
    err.statusCode = 404;
    throw err;
  }

  const reference = generateContributionReference();

  try {
    const contribution = await Contribution.create({
      memberId,
      amount: Number(amount),
      month: monthNum,
      year: yearNum,
      status: "PENDING",
      reference,
    });
    return contribution;
  } catch (err) {
    // Handle unique index (memberId, month, year)
    if (err.code === 11000) {
      const dup = new Error(
        "Contribution for this month and year already exists for this user"
      );
      dup.statusCode = 409;
      throw dup;
    }
    throw err;
  }
}

/**
 * Get contributions for a user in a given year.
 * Options: { memberId, year }
 */
export async function getUserContributionsByYear({ memberId, year }) {
  if (!isValidObjectId(memberId)) {
    const err = new Error("Invalid member ID");
    err.statusCode = 400;
    throw err;
  }

  const yearNum = Number(year);
  if (!yearNum || yearNum < 2000) {
    const err = new Error("Year is required and must be >= 2000");
    err.statusCode = 400;
    throw err;
  }

  const items = await Contribution.find({
    memberId,
    year: yearNum,
  }).sort({ month: 1, createdAt: 1 });

  return { items, year: yearNum };
}

/**
 * Get a single contribution for a user for specific year + month
 */
export async function getUserContributionByYearMonth({
  memberId,
  year,
  month,
}) {
  if (!isValidObjectId(memberId)) {
    const err = new Error("Invalid member ID");
    err.statusCode = 400;
    throw err;
  }

  const yearNum = Number(year);
  const monthNum = Number(month);

  if (!yearNum || yearNum < 2000) {
    const err = new Error("Year is required and must be >= 2000");
    err.statusCode = 400;
    throw err;
  }
  if (!monthNum || monthNum < 1 || monthNum > 12) {
    const err = new Error("Month must be between 1 and 12");
    err.statusCode = 400;
    throw err;
  }

  const contribution = await Contribution.findOne({
    memberId,
    year: yearNum,
    month: monthNum,
  });

  if (!contribution) {
    const err = new Error("Contribution not found");
    err.statusCode = 404;
    throw err;
  }

  return contribution;
}

/**
 * Get ALL contributions for a user (optionally filtered by year/status)
 */
export async function getAllContributionsForUser({ memberId, year, status }) {
  if (!isValidObjectId(memberId)) {
    const err = new Error("Invalid member ID");
    err.statusCode = 400;
    throw err;
  }

  const filter = { memberId };

  if (year) {
    const yearNum = Number(year);
    if (!yearNum || yearNum < 2000) {
      const err = new Error("Year must be >= 2000");
      err.statusCode = 400;
      throw err;
    }
    filter.year = yearNum;
  }

  if (status) {
    filter.status = status;
  }

  const items = await Contribution.find(filter).sort({
    year: 1,
    month: 1,
    createdAt: 1,
  });

  return items;
}

/**
 * Get ALL contributions (admin), with optional filters
 */
export async function getAllContributions({
  page = 1,
  limit = 20,
  memberId,
  year,
  status,
}) {
  const filter = {};

  if (memberId) {
    if (!isValidObjectId(memberId)) {
      const err = new Error("Invalid member ID");
      err.statusCode = 400;
      throw err;
    }
    filter.memberId = memberId;
  }

  if (year) {
    const yearNum = Number(year);
    if (!yearNum || yearNum < 2000) {
      const err = new Error("Year must be >= 2000");
      err.statusCode = 400;
      throw err;
    }
    filter.year = yearNum;
  }

  if (status) {
    filter.status = status;
  }

  page = Number(page) || 1;
  limit = Number(limit) || 20;
  const skip = (page - 1) * limit;

  const query = Contribution.find(filter)
    .sort({ year: -1, month: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("memberId", "firstName lastName phone");

  const [items, total] = await Promise.all([
    query.exec(),
    Contribution.countDocuments(filter),
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
 * Delete a contribution by ID
 */
export async function deleteContribution(contributionId) {
  if (!isValidObjectId(contributionId)) {
    const err = new Error("Invalid contribution ID");
    err.statusCode = 400;
    throw err;
  }

  const existing = await Contribution.findById(contributionId);
  if (!existing) {
    const err = new Error("Contribution not found");
    err.statusCode = 404;
    throw err;
  }

  await Contribution.deleteOne({ _id: contributionId });
  return { success: true };
}

/**
 * Update contribution status (e.g. PENDING -> PAID)
 */
export async function updateContributionStatus(contributionId, status) {
  if (!isValidObjectId(contributionId)) {
    const err = new Error("Invalid contribution ID");
    err.statusCode = 400;
    throw err;
  }

  if (!["PENDING", "PAID"].includes(status)) {
    const err = new Error("Invalid contribution status");
    err.statusCode = 400;
    throw err;
  }

  const contribution = await Contribution.findById(contributionId);
  if (!contribution) {
    const err = new Error("Contribution not found");
    err.statusCode = 404;
    throw err;
  }

  contribution.status = status;
  await contribution.save();
  return contribution;
}

/**
 * Convenience: mark contribution as PAID
 */
export async function markContributionPaid(contributionId) {
  return updateContributionStatus(contributionId, "PAID");
}

/**
 * Get total PAID contributions for a user in a given year
 */
export async function getUserPaidTotalForYear({ memberId, year }) {
  if (!isValidObjectId(memberId)) {
    const err = new Error("Invalid member ID");
    err.statusCode = 400;
    throw err;
  }

  const yearNum = Number(year);
  if (!yearNum || yearNum < 2000) {
    const err = new Error("Year is required and must be >= 2000");
    err.statusCode = 400;
    throw err;
  }

  const result = await Contribution.aggregate([
    {
      $match: {
        memberId: new mongoose.Types.ObjectId(memberId),
        year: yearNum,
        status: "PAID",
      },
    },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: "$amount" },
      },
    },
  ]);

  const totalPaid = result[0]?.totalPaid || 0;
  return { memberId, year: yearNum, totalPaid };
}

/**
 * Calculate year-end payout skeleton
 * - For now: just group PAID contributions per user for the year.
 * - Later: you can apply your dividend logic on top of these totals.
 */
export async function calculateYearEndPayouts(year) {
  const yearNum = Number(year);
  if (!yearNum || yearNum < 2000) {
    const err = new Error("Year is required and must be >= 2000");
    err.statusCode = 400;
    throw err;
  }

  const rows = await Contribution.aggregate([
    {
      $match: {
        year: yearNum,
        status: "PAID",
      },
    },
    {
      $group: {
        _id: "$memberId",
        totalContributed: { $sum: "$amount" },
      },
    },
    {
      $sort: { totalContributed: -1 },
    },
  ]);

  // For now, we just attach a placeholder payout = totalContributed.
  // Later: replace payout with your actual dividend logic.
  const payouts = rows.map((row) => ({
    memberId: row._id,
    year: yearNum,
    totalContributed: row.totalContributed,
    payoutAmount: row.totalContributed, // TODO: replace with real formula
  }));

  return payouts;
}

/**
 * Ensure a member has monthly contributions for a year.
 *
 * Designed so it can be called from:
 *  - a cron job in JAN (startMonth = 1)
 *  - user registration handler (startMonth = current month)
 *
 * It is **idempotent**: uses upsert + unique index (memberId, month, year),
 * so calling it multiple times won't duplicate records.
 */
const DEFAULT_MONTHLY_AMOUNT = 500;
export async function ensureYearlyContributionsForMember({
  memberId,
  year,
  amountPerMonth = DEFAULT_MONTHLY_AMOUNT,
  startMonth,
  endMonth,
}) {
  if (!memberId || !year) {
    const err = new Error("memberId and year are required");
    err.statusCode = 400;
    throw err;
  }

  const numericYear = Number(year);
  if (!numericYear || numericYear < 2000) {
    const err = new Error("Invalid year");
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  const fromMonth = startMonth ?? 1; // cron in Jan will likely use 1
  const toMonth = endMonth ?? 12;

  for (let m = fromMonth; m <= toMonth; m++) {
    await Contribution.updateOne(
      { memberId, year: numericYear, month: m },
      {
        $setOnInsert: {
          memberId,
          year: numericYear,
          month: m,
          amount: amountPerMonth,
          status: "PENDING",
          reference: generateContributionReference(),
        },
      },
      { upsert: true }
    );
  }

  return { memberId, year: numericYear, fromMonth, toMonth };
}

/**
 * For cron: ensure all MEMBERS have their yearly contributions created.
 *
 * Example cron (January 1, 2026):
 *   await ensureYearlyContributionsForAllMembers({ year: 2026 });
 *
 * Example on registration (join in April):
 *   await ensureYearlyContributionsForMember({
 *     memberId: newUser._id,
 *     year: 2026,
 *     startMonth: 4,
 *   });
 */
export async function ensureYearlyContributionsForAllMembers({
  year,
  amountPerMonth = 500,
  startMonth,
  endMonth,
}) {
  const members = await getAllMemberUsers();

  for (const member of members) {
    await ensureYearlyContributionsForMember({
      memberId: member._id,
      year,
      amountPerMonth,
      startMonth,
      endMonth,
    });
  }

  return {
    year,
    amountPerMonth,
    totalMembers: members.length,
  };
}

/**
 * Get a single contribution by ID.
 *
 * - If memberId is provided, we enforce that the contribution belongs
 *   to that member (for MEMBER-facing endpoints).
 * - For admin endpoints, you can call with { forAdmin: true } so it
 *   only checks the contributionId.
 */
export async function getContributionById(contributionId, options = {}) {
  const { memberId, forAdmin = false } = options;

  if (!isValidObjectId(contributionId)) {
    const err = new Error("Invalid contribution ID");
    err.statusCode = 400;
    throw err;
  }

  const filter = { _id: contributionId };

  // For member-facing usage, make sure they only see their own contribution
  if (!forAdmin && memberId) {
    if (!isValidObjectId(memberId)) {
      const err = new Error("Invalid member ID");
      err.statusCode = 400;
      throw err;
    }
    filter.memberId = memberId;
  }

  const contribution = await Contribution.findOne(filter).populate(
    "memberId",
    "firstName lastName phone roles status"
  );

  if (!contribution) {
    const err = new Error("Contribution not found");
    err.statusCode = 404;
    throw err;
  }

  return contribution;
}
