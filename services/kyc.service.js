// services/kyc.service.js
// Business logic for KYC submissions and approvals.

import Models from "../model/model.js";
import mongoose from "mongoose";

const { kyc: Kyc, user: User } = Models;
const { isValidObjectId } = mongoose;

const ALLOWED_DOC_TYPES = ["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE"];

/**
 * submitKYC({ userId, fields, docIds })
 *
 * fields: {
 *   country,
 *   idNo,
 *   documentType
 * }
 *
 * docIds: {
 *   front,
 *   back?,
 *   selfie
 * }
 */
export async function submitKYCService({ userId, fields = {}, docIds = {} }) {
  const { country, idNo, documentType } = fields;
  const { front, back, selfie } = docIds;

  if (!userId || !country || !idNo || !documentType || !front || !selfie) {
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

  // Optionally: you can mark older KYC records as superseded; for now we just create a new one.
  const kyc = await Kyc.create({
    userId,
    country: String(country).trim(),
    idNo: String(idNo).trim(),
    documentType: docTypeUpper,
    front,
    back: back || null,
    selfie,
    status: "PENDING",
    reason: "",
  });

  return kyc;
}

/**
 * approveKYC({ adminId, kycId })
 *
 * - Ensures admin exists
 * - Ensures KYC exists
 * - Sets status to APPROVED and clears reason
 * - Optionally updates user.status to ACTIVE
 */
export async function approveKYCService({ adminId, kycId }) {
  if (!adminId || !kycId) {
    const err = new Error("adminId and kycId are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(adminId)) {
    const err = new Error("Invalid adminId");
    err.code = "INVALID_ADMIN_ID";
    throw err;
  }

  if (!isValidObjectId(kycId)) {
    const err = new Error("Invalid kycId");
    err.code = "INVALID_KYC_ID";
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

  // Optionally update user status
  const user = await User.findById(kyc.userId);
  if (user && user.status === "PENDING_KYC") {
    user.status = "ACTIVE";
    await user.save();
  }

  return { kyc, user };
}

/**
 * rejectKYC({ adminId, kycId, reason })
 *
 * - Sets status to REJECTED and stores reason.
 */
export async function rejectKYCService({ adminId, kycId, reason }) {
  if (!adminId || !kycId || !reason) {
    const err = new Error("adminId, kycId and reason are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(adminId)) {
    const err = new Error("Invalid adminId");
    err.code = "INVALID_ADMIN_ID";
    throw err;
  }

  if (!isValidObjectId(kycId)) {
    const err = new Error("Invalid kycId");
    err.code = "INVALID_KYC_ID";
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

  // Optionally update user.status back to PENDING_KYC or something else.
  const user = await User.findById(kyc.userId);
  if (user && user.status === "ACTIVE") {
    // depending on your logic you may or may not change it;
    // for now we leave user.status as-is.
  }

  return { kyc, user };
}

/**
 * getKYCByUser(userId)
 *
 * Returns the latest KYC submission for a user (most recent createdAt).
 */
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
