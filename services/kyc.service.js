// services/kyc.service.js
// Business logic for KYC submissions and approvals.

import Models from "../model/model.js";
import mongoose from "mongoose";
import { upsertAddressForUserService } from "./address.service.js"; // same folder

const { kyc: Kyc, user: User } = Models;
const { isValidObjectId } = mongoose;

const ALLOWED_DOC_TYPES = [
  "NATIONAL_ID",
  "PASSPORT",
  "DRIVERS_LICENSE",
  "PERMIT",
];

/**
 * submitKYCService
 *
 * payload:
 * {
 *   userId,
 *   fields: {
 *     idNo,
 *     documentType,
 *   },
 *   docIds: {
 *     front,
 *     back,
 *     selfie,
 *   },
 *   address: {
 *     streetNumber,
 *     streetName,
 *     suburb,
 *     city,
 *     province,
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
  const { documentType, idNo } = fields;
  const { front, back, selfie } = docIds;
  const { streetNumber, streetName, suburb, city, province, country } = address;

  // Required KYC fields (no "country" here anymore)

  const missing = [];

  // user Id
  if (!userId) missing.push("userId missing");

  // fields
  if (!documentType) missing.push("documentType missing");
  if (!idNo) missing.push("idNo missing");

  // docs
  if (!front) missing.push("front missing");
  if (!back) missing.push("back missing");
  if (!selfie) missing.push("selfie missing");

  // address
  if (!streetNumber) missing.push("street number missing");
  if (!streetName) missing.push("street name missing");
  if (!suburb) missing.push("suburb missing");
  if (!city) missing.push("city missing");
  if (!province) missing.push("province missing");
  if (!country) missing.push("country missing");

  if (missing.length > 0) {
    const err = new Error(missing.join(", "));
    err.code = "FIELDS_REQUIRED";
    err.missing = missing;
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
  /*if (!ALLOWED_DOC_TYPES.includes(docTypeUpper)) {
    const err = new Error("Invalid document type");
    err.code = "INVALID_DOC_TYPE";
    throw err;
  }*/

  // 1) Create KYC record
  const kyc = await Kyc.create({
    userId,
    idNo: "",
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
 * approveKYCService
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

/**
 * rejectKYCService
 */
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

  const user = await User.findById(kyc.userId); // optional
  return { kyc, user };
}

/**
 * getKYCByUserService
 * Returns latest KYC for a user.
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

/**
 * getAllKYCService
 * Admin: list all KYC submissions (newest first).
 */
export async function getAllKYCService() {
  const kycs = await Kyc.find().sort({ createdAt: -1 }).lean();
  return kycs;
}
