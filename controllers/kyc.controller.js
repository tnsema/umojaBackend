// controllers/kyc.controller.js

import {
  submitKYCService,
  approveKYCService,
  rejectKYCService,
  getKYCByUserService,
} from "../services/kyc.service.js";

/**
 * POST /kyc/submit
 *
 * Form-data:
 *  - country
 *  - idNo
 *  - documentType ("NATIONAL_ID" | "PASSPORT" | "DRIVERS_LICENSE")
 *  - front       (string file key / path)
 *  - back?       (string file key / path)
 *  - selfie      (string file key / path)
 *
 * Auth: jwtVerify (user submits their own KYC)
 */
export async function submitKYC(req, res) {
  try {
    const userId = req.payload?.userId || req.body.userId; // prefer logged-in user
    const { country, idNo, documentType, front, back, selfie } = req.body || {};

    const kyc = await submitKYCService({
      userId,
      fields: { country, idNo, documentType },
      docIds: { front, back, selfie },
    });

    return res.status(201).json({
      status: true,
      message: "KYC submitted successfully",
      data: kyc,
    });
  } catch (err) {
    console.error("Error in submitKYC:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message:
          "userId, country, idNo, documentType, front and selfie are required",
      });
    }

    if (err.code === "INVALID_USER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid userId",
      });
    }

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (err.code === "INVALID_DOC_TYPE") {
      return res.status(400).json({
        status: false,
        message: "Invalid document type",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while submitting KYC",
    });
  }
}

/**
 * POST /kyc/:kycId/approve
 *
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function approveKYC(req, res) {
  try {
    const adminId = req.payload?.userId;
    const { kycId } = req.params;

    const result = await approveKYCService({ adminId, kycId });

    return res.status(200).json({
      status: true,
      message: "KYC approved successfully",
      data: result,
    });
  } catch (err) {
    console.error("Error in approveKYC:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "adminId and kycId are required",
      });
    }

    if (err.code === "INVALID_ADMIN_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid adminId",
      });
    }

    if (err.code === "INVALID_KYC_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid kycId",
      });
    }

    if (err.code === "ADMIN_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Admin user not found",
      });
    }

    if (err.code === "KYC_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "KYC submission not found",
      });
    }

    if (err.code === "ALREADY_APPROVED") {
      return res.status(400).json({
        status: false,
        message: "KYC already approved",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while approving KYC",
    });
  }
}

/**
 * POST /kyc/:kycId/reject
 *
 * Form-data:
 *  - reason
 *
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function rejectKYC(req, res) {
  try {
    const adminId = req.payload?.userId;
    const { kycId } = req.params;
    const { reason } = req.body || {};

    const result = await rejectKYCService({ adminId, kycId, reason });

    return res.status(200).json({
      status: true,
      message: "KYC rejected successfully",
      data: result,
    });
  } catch (err) {
    console.error("Error in rejectKYC:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "adminId, kycId and reason are required",
      });
    }

    if (err.code === "INVALID_ADMIN_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid adminId",
      });
    }

    if (err.code === "INVALID_KYC_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid kycId",
      });
    }

    if (err.code === "ADMIN_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Admin user not found",
      });
    }

    if (err.code === "KYC_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "KYC submission not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while rejecting KYC",
    });
  }
}

/**
 * GET /kyc/me
 * Auth: jwtVerify
 * Returns current user's latest KYC
 */
export async function getMyKYC(req, res) {
  try {
    const userId = req.payload?.userId;

    const kyc = await getKYCByUserService(userId);

    return res.status(200).json({
      status: true,
      data: kyc,
    });
  } catch (err) {
    console.error("Error in getMyKYC:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "userId is required",
      });
    }

    if (err.code === "INVALID_USER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid userId",
      });
    }

    if (err.code === "KYC_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "No KYC submission found for user",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching KYC",
    });
  }
}

/**
 * GET /kyc/user/:userId
 * Auth: jwtVerify + requireRole("ADMIN")
 * Admin fetches a user's latest KYC
 */
export async function getKYCByUser(req, res) {
  try {
    const { userId } = req.params;

    const kyc = await getKYCByUserService(userId);

    return res.status(200).json({
      status: true,
      data: kyc,
    });
  } catch (err) {
    console.error("Error in getKYCByUser:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "userId is required",
      });
    }

    if (err.code === "INVALID_USER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid userId",
      });
    }

    if (err.code === "KYC_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "No KYC submission found for user",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching KYC",
    });
  }
}
