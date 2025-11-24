// controllers/kyc.controller.js

import {
  submitKYCService,
  approveKYCService,
  rejectKYCService,
  getKYCByUserService,
  getAllKYCService,
} from "../services/kyc.service.js";

/**
 * POST /kyc/submit
 * User submits their own KYC.
 *
 * Body (form-data or JSON):
 *  - idNo
 *  - documentType  (NATIONAL_ID | PASSPORT | DRIVERS_LICENSE)
 *
 * Files (optional if you wire multer):
 *  - front
 *  - back
 *  - selfie
 */
export async function submitKYC(req, res) {
  try {
    const userId = req.payload?.userId;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    // ====== KYC FIELDS FROM BODY ======
    const { idNo, documentType } = req.body || {};

    // ====== ADDRESS FIELDS FROM BODY ======
    const {
      streetNumber,
      streetName,
      suburb,
      city,
      province,
      postalCode,
      country,
    } = req.body || {};

    // ====== FILES (IF USING MULTER.FIELDS) ======
    const files = req.files || {};
    const frontFile = files.front?.[0];
    const backFile = files.back?.[0];
    const selfieFile = files.selfie?.[0];

    const docIds = {
      front: frontFile ? frontFile.path || frontFile.filename : req.body?.front,
      back: backFile ? backFile.path || backFile.filename : req.body?.back,
      selfie: selfieFile
        ? selfieFile.path || selfieFile.filename
        : req.body?.selfie,
    };

    // ====== ADDRESS OBJECT FOR ADDRESS SERVICE / KYC SERVICE ======
    const address = {
      streetNumber: streetNumber || "",
      streetName: streetName || "",
      suburb: suburb || "",
      city: city || "",
      province: province || "",
      postalCode: postalCode || "",
      country: country || "South Africa",
    };

    const result = await submitKYCService({
      userId,
      fields: { idNo, documentType },
      docIds,
      address,
    });

    return res.status(201).json({
      status: true,
      message: "KYC submitted successfully",
      data: result,
    });
  } catch (err) {
    console.error("submitKYC error:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "Missing required KYC fields",
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
 * Admin approves KYC.
 */
export async function approveKYC(req, res) {
  try {
    const adminId = req.payload?.userId;
    const { kycId } = req.params;

    if (!adminId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const result = await approveKYCService({ adminId, kycId });

    return res.status(200).json({
      status: true,
      message: "KYC approved successfully",
      data: result,
    });
  } catch (err) {
    console.error("approveKYC error:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "adminId and kycId are required",
      });
    }

    if (err.code === "INVALID_ID" || err.code === "INVALID_KYC_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid ID provided",
      });
    }

    if (err.code === "ADMIN_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Admin not found",
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
 * Admin rejects KYC with a reason.
 *
 * Body:
 *  - reason (string)
 */
export async function rejectKYC(req, res) {
  try {
    const adminId = req.payload?.userId;
    const { kycId } = req.params;
    const { reason } = req.body || {};

    if (!adminId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const result = await rejectKYCService({ adminId, kycId, reason });

    return res.status(200).json({
      status: true,
      message: "KYC rejected successfully",
      data: result,
    });
  } catch (err) {
    console.error("rejectKYC error:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "adminId, kycId and reason are required",
      });
    }

    if (err.code === "INVALID_ID" || err.code === "INVALID_KYC_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid ID provided",
      });
    }

    if (err.code === "ADMIN_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Admin not found",
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
 * Logged-in user: get their latest KYC.
 */
export async function getMyKYC(req, res) {
  try {
    const userId = req.payload?.userId;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const kyc = await getKYCByUserService(userId);

    return res.status(200).json({
      status: true,
      data: kyc,
    });
  } catch (err) {
    console.error("getMyKYC error:", err);

    if (err.code === "INVALID_USER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid userId",
      });
    }

    if (err.code === "KYC_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "No KYC submission found",
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
 * Admin: get latest KYC for specific user.
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
    console.error("getKYCByUser error:", err);

    if (err.code === "INVALID_USER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid userId",
      });
    }

    if (err.code === "KYC_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "No KYC submission found for this user",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching KYC by user",
    });
  }
}

export async function listAllKYC(req, res) {
  try {
    const data = await getAllKYCService();

    return res.status(200).json({
      status: true,
      message: "All KYC submissions fetched",
      data,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Server error fetching KYC list",
    });
  }
}
