// services/kyc.service.js
// Business logic for KYC submissions and approvals.

import Models from "../model/model.js";
import mongoose from "mongoose";
import { upsertAddressForUserService } from "../services/address.service.js"; // ⬅️ new

const { kyc: Kyc, user: User } = Models;
const { isValidObjectId } = mongoose;

const ALLOWED_DOC_TYPES = ["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE"];

/**
 * submitKYCService
 *
 * payload:
 * {
 *   userId,
 *   fields: { idNo, documentType },
 *   docIds: { front, back, selfie },
 *   address: {
 *     line1,
 *     line2,
 *     city,
 *     state,
 *     postalCode,
 *     country
 *   }
 * }
 */
export async function submitKYCService({
  userId,
  fields = {},
  docIds = {},
  address = {},
}) {
  const { idNo, documentType } = fields;
  const { front, back, selfie } = docIds;

  // Required KYC fields (note: no "country" here)
  if (!userId || !idNo || !documentType || !front || !selfie) {
    const err = new Error("Missing required KYC fields");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(userId)) {
    const err = new Error("Invalid userId");
    err.code = "INVALID_USER_ID";
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const docTypeUpper = String(documentType).trim().toUpperCase();
  if (!ALLOWED_DOC_TYPES.includes(docTypeUpper)) {
    const err = new Error("Invalid document type");
    err.code = "INVALID_DOC_TYPE";
    throw err;
  }

  // 1) Create KYC record
  const kyc = await Kyc.create({
    userId,
    idNo: String(idNo).trim(),
    documentType: docTypeUpper,
    front,
    back: back || null,
    selfie,
    status: "PENDING",
    reason: "",
  });

  // 2) Upsert address using address service (if any address fields provided)
  let savedAddress = null;
  const hasAddressData =
    address &&
    Object.values(address).some(
      (v) => v !== undefined && v !== null && v !== ""
    );

  if (hasAddressData) {
    savedAddress = await upsertAddressForUserService(userId, address);
  }

  return { kyc, address: savedAddress };
}

/**
 * approveKYCService, rejectKYCService, getKYCByUserService
 * (unchanged from previous fixed version)
 */

export async function approveKYCService({ adminId, kycId }) {
  if (!adminId || !kycId) {
    const err = new Error("adminId and kycId are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(adminId) || !isValidObjectId(kycId)) {
    const err = new Error("Invalid ID");
    err.code = "INVALID_ID";
    throw err;
  }

  const admin = await User.findById(adminId);
  if (!admin) {
    const err = new Error("Admin user not found");
    err.code = "ADMIN_NOT_FOUND";
    throw err;
  }

  const kyc = await Kyc.findById(kycId);
  if (!kyc) {
    const err = new Error("KYC submission not found");
    err.code = "KYC_NOT_FOUND";
    throw err;
  }

  if (kyc.status === "APPROVED") {
    const err = new Error("KYC already approved");
    err.code = "ALREADY_APPROVED";
    throw err;
  }

  kyc.status = "APPROVED";
  kyc.reason = "";
  await kyc.save();

  const user = await User.findById(kyc.userId);
  if (user && user.status === "PENDING_KYC") {
    user.status = "ACTIVE";
    await user.save();
  }

  return { kyc, user };
}

export async function rejectKYCService({ adminId, kycId, reason }) {
  if (!adminId || !kycId || !reason) {
    const err = new Error("adminId, kycId and reason are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(adminId) || !isValidObjectId(kycId)) {
    const err = new Error("Invalid ID");
    err.code = "INVALID_ID";
    throw err;
  }

  const admin = await User.findById(adminId);
  if (!admin) {
    const err = new Error("Admin user not found");
    err.code = "ADMIN_NOT_FOUND";
    throw err;
  }

  const kyc = await Kyc.findById(kycId);
  if (!kyc) {
    const err = new Error("KYC submission not found");
    err.code = "KYC_NOT_FOUND";
    throw err;
  }

  kyc.status = "REJECTED";
  kyc.reason = String(reason).trim();
  await kyc.save();

  const user = await User.findById(kyc.userId); // optional, kept for symmetry
  return { kyc, user };
}

export async function getKYCByUserService(userId) {
  if (!userId) {
    const err = new Error("userId is required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(userId)) {
    const err = new Error("Invalid userId");
    err.code = "INVALID_USER_ID";
    throw err;
  }

  const kyc = await Kyc.findOne({ userId }).sort({ createdAt: -1 }).lean();

  if (!kyc) {
    const err = new Error("No KYC submission found for user");
    err.code = "KYC_NOT_FOUND";
    throw err;
  }

  return kyc;
}
