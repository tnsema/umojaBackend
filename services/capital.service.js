// services/capital.service.js
import mongoose from "mongoose";
import Models from "../model/model.js";

const { capital: Capital, user: User } = Models;
const { isValidObjectId } = mongoose;

// TODO: if you already have this in config/constants, import from there
const MEMBER_ROLE_ID = "69162e65f0d00f0f2241aa5a";

export const DEFAULT_ANNUAL_CAPITAL_AMOUNT = 2000; // change if needed

// ----- helpers -------------------------------------------------------------

function generateCapitalReference() {
  // Example: AC2025-XXXXXXXX
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1_0000_0000)
    .toString()
    .padStart(8, "0");
  return `AC${year}-${random}`;
}

function assertValidObjectId(id, fieldName = "id") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`Invalid ${fieldName}`);
    err.statusCode = 400;
    throw err;
  }
}

// ----- CRUD-style operations -----------------------------------------------

export async function createCapital({
  memberId,
  year,
  amount,
  reference,
  status = "PENDING",
}) {
  if (!memberId || !year || !amount) {
    const err = new Error("memberId, year and amount are required");
    err.statusCode = 400;
    throw err;
  }

  assertValidObjectId(memberId, "memberId");
  const numericYear = Number(year);

  // ensure unique per member-year
  const existing = await Capital.findOne({ memberId, year: numericYear });
  if (existing) {
    const err = new Error("Capital for this member and year already exists");
    err.statusCode = 409;
    throw err;
  }

  const capital = await Capital.create({
    memberId,
    year: numericYear,
    amount,
    reference: reference || generateCapitalReference(),
    status,
  });

  return capital;
}

export async function updateCapitalStatus({ capitalId, status }) {
  if (!capitalId || !status) {
    const err = new Error("capitalId and status are required");
    err.statusCode = 400;
    throw err;
  }
  assertValidObjectId(capitalId, "capitalId");

  if (!["PENDING", "PAID"].includes(status)) {
    const err = new Error("Invalid status");
    err.statusCode = 400;
    throw err;
  }

  const capital = await Capital.findByIdAndUpdate(
    capitalId,
    { status },
    { new: true }
  );

  if (!capital) {
    const err = new Error("Capital not found");
    err.statusCode = 404;
    throw err;
  }

  return capital;
}

export async function markCapitalPaid({ capitalId }) {
  return updateCapitalStatus({ capitalId, status: "PAID" });
}

export async function deleteCapital({ capitalId }) {
  if (!capitalId) {
    const err = new Error("capitalId is required");
    err.statusCode = 400;
    throw err;
  }
  assertValidObjectId(capitalId, "capitalId");

  const deleted = await Capital.findByIdAndDelete(capitalId);
  if (!deleted) {
    const err = new Error("Capital not found");
    err.statusCode = 404;
    throw err;
  }

  return deleted;
}

export async function getCapitalwForMemberYear({ memberId, year }) {
  if (!memberId || !year) {
    const err = new Error("memberId and year are required");
    err.statusCode = 400;
    throw err;
  }
  assertValidObjectId(memberId, "memberId");
  const numericYear = Number(year);

  const capital = await Capital.findOne({ memberId, year: numericYear });
  return capital;
}

export async function getAllCapitals({
  year,
  memberId,
  status,
  page = 1,
  limit = 20,
}) {
  const query = {};
  if (year) query.year = Number(year);
  if (memberId) {
    assertValidObjectId(memberId, "memberId");
    query.memberId = memberId;
  }
  if (status && ["PENDING", "PAID"].includes(status)) {
    query.status = status;
  }

  const numericPage = Number(page) || 1;
  const numericLimit = Number(limit) || 20;
  const skip = (numericPage - 1) * numericLimit;

  const [items, total] = await Promise.all([
    Capital.find(query)
      .sort({ year: -1, createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .populate("memberId", "firstName lastName phone"),
    Capital.countDocuments(query),
  ]);

  return {
    items,
    total,
    page: numericPage,
    limit: numericLimit,
    totalPages: Math.ceil(total / numericLimit) || 1,
  };
}

export async function isCurrentYearCapitalPaidForMember({ memberId }) {
  if (!memberId) {
    const err = new Error("memberId is required");
    err.statusCode = 400;
    throw err;
  }
  assertValidObjectId(memberId, "memberId");

  const currentYear = new Date().getFullYear();

  const capital = await Capital.findOne({
    memberId,
    year: currentYear,
  });

  return {
    paid: !!capital && capital.status === "PAID",
    capital,
  };
}

// ----- Cron-friendly functions ---------------------------------------------

/**
 * Ensure a capital record exists for a member for a given year.
 * Used by cron in January AND by the "member registered after January" flow.
 */
export async function ensureCapitalForMemberYear({
  memberId,
  year,
  amount = DEFAULT_ANNUAL_CAPITAL_AMOUNT,
}) {
  if (!memberId || !year) {
    const err = new Error("memberId and year are required");
    err.statusCode = 400;
    throw err;
  }
  assertValidObjectId(memberId, "memberId");
  const numericYear = Number(year);

  const existing = await Capital.findOne({ memberId, year: numericYear });
  if (existing) {
    // nothing to do
    return existing;
  }

  const capital = await Capital.create({
    memberId,
    year: numericYear,
    amount,
    reference: generateCapitalReference(),
    status: "PENDING",
  });

  return capital;
}

/**
 * Called by a cron job in January:
 *   - finds all users with MEMBER role
 *   - ensures one capital record per member for that year
 */
export async function ensureAnnualCapitalForAllMembers({
  year,
  amountPerMember = DEFAULT_ANNUAL_CAPITAL_AMOUNT,
}) {
  const numericYear = Number(year) || new Date().getFullYear();

  // fetch all members (users that contain MEMBER_ROLE_ID in roles array)
  const members = await User.find({
    roles: { $in: [MEMBER_ROLE_ID] },
  }).select("_id");

  const results = [];
  for (const m of members) {
    const capital = await ensureCapitalForMemberYear({
      memberId: m._id,
      year: numericYear,
      amount: amountPerMember,
    });
    results.push(capital);
  }

  return {
    year: numericYear,
    count: results.length,
  };
}

/**
 * Called when a new member registers AFTER January.
 * e.g. in user.service after user creation, only if they have MEMBER role.
 */
export async function ensureCapitalForNewMemberOnRegistration({
  memberId,
  amount = DEFAULT_ANNUAL_CAPITAL_AMOUNT,
}) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Optional: only create if we are after January (month > 1)
  // const currentMonth = now.getMonth() + 1;
  // if (currentMonth === 1) return null; // January: cron will handle

  return ensureCapitalForMemberYear({
    memberId,
    year: currentYear,
    amount,
  });
}

export async function getCapitalById({ capitalId }) {
  if (!capitalId) {
    const err = new Error("capitalId is required");
    err.statusCode = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(capitalId)) {
    const err = new Error("Invalid capitalId");
    err.statusCode = 400;
    throw err;
  }

  const capital = await Capital.findById(capitalId).populate(
    "memberId",
    "firstName lastName phone"
  );

  if (!capital) {
    const err = new Error("Capital record not found");
    err.statusCode = 404;
    throw err;
  }

  return capital;
}

/**
 * Get capital record for a member + year
 */
export async function getCapitalForMemberYear({ memberId, year }) {
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

  const capital = await Capital.findOne({ memberId, year: numericYear })
    .populate("memberId", "firstName lastName phone")
    .lean();

  return capital;
}

/**
 * Get capital record for the CURRENT year for this member
 */
export async function getCurrentYearCapitalForMember(memberId) {
  const year = new Date().getFullYear();
  return getCapitalForMemberYear({ memberId, year });
}
