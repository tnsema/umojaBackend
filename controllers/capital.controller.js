// controllers/capital.controller.js
import {
  createCapital,
  updateCapitalStatus,
  markCapitalPaid,
  deleteCapital,
  getCapitalForMemberYear,
  getAllCapitals,
  isCurrentYearCapitalPaidForMember,
  ensureAnnualCapitalForAllMembers,
  ensureCapitalForNewMemberOnRegistration,
  getCapitalById,
  getCurrentYearCapitalForMember,
  ensureCapitalForMemberYear,
} from "../services/capital.service.js";

/**
 * MEMBER: GET /capital/me?year=2025
 */
export async function getMyCapitalForYearController(req, res) {
  try {
    const memberId = req.payload?.userId;
    if (!memberId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const { year } = req.query;
    const capital = await getCapitalForMemberYear({ memberId, year });

    return res.json({
      status: true,
      message: "Capital fetched successfully",
      data: { capital },
    });
  } catch (err) {
    console.error("getMyCapitalForYearController error:", err);
    return res.status(err.statusCode || 500).json({
      status: false,
      message: err.message || "Error fetching capital for year",
    });
  }
}

/**
 * ADMIN: GET /admin/capital
 * Query: year, memberId, status, page, limit
 */
export async function getAllCapitalsController(req, res) {
  try {
    const { year, memberId, status, page, limit } = req.query;

    const result = await getAllCapitals({
      year,
      memberId,
      status,
      page,
      limit,
    });

    return res.json({
      status: true,
      message: "Capitals fetched successfully",
      data: result,
    });
  } catch (err) {
    console.error("getAllCapitalsController error:", err);
    return res.status(err.statusCode || 500).json({
      status: false,
      message: err.message || "Error fetching capitals",
    });
  }
}

/**
 * ADMIN: POST /admin/capital
 * Body: { memberId, year, amount }
 */
export async function createCapitalController(req, res) {
  try {
    const { memberId, year, amount } = req.body;

    const capital = await createCapital({
      memberId,
      year,
      amount: Number(amount),
    });

    return res.status(201).json({
      status: true,
      message: "Capital created",
      data: { capital },
    });
  } catch (err) {
    console.error("createCapitalController error:", err);
    return res.status(err.statusCode || 500).json({
      status: false,
      message: err.message || "Error creating capital",
    });
  }
}

/**
 * ADMIN: PATCH /admin/capital/:id/status
 * Body: { status: "PENDING" | "PAID" }
 */
export async function updateCapitalStatusController(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const capital = await updateCapitalStatus({ capitalId: id, status });

    return res.json({
      status: true,
      message: "Capital status updated",
      data: { capital },
    });
  } catch (err) {
    console.error("updateCapitalStatusController error:", err);
    return res.status(err.statusCode || 500).json({
      status: false,
      message: err.message || "Error updating capital status",
    });
  }
}

/**
 * ADMIN: POST /admin/capital/:id/mark-paid
 */
export async function markCapitalPaidController(req, res) {
  try {
    const { id } = req.params;

    const capital = await markCapitalPaid({ capitalId: id });

    return res.json({
      status: true,
      message: "Capital marked as PAID",
      data: { capital },
    });
  } catch (err) {
    console.error("markCapitalPaidController error:", err);
    return res.status(err.statusCode || 500).json({
      status: false,
      message: err.message || "Error marking capital as paid",
    });
  }
}

/**
 * ADMIN: DELETE /admin/capital/:id
 */
export async function deleteCapitalController(req, res) {
  try {
    const { id } = req.params;

    const capital = await deleteCapital({ capitalId: id });

    return res.json({
      status: true,
      message: "Capital deleted",
      data: { capital },
    });
  } catch (err) {
    console.error("deleteCapitalController error:", err);
    return res.status(err.statusCode || 500).json({
      status: false,
      message: err.message || "Error deleting capital",
    });
  }
}

/**
 * MEMBER: GET /capital/me/is-current-year-paid
 */
export async function isMyCurrentYearCapitalPaidController(req, res) {
  try {
    const memberId = req.payload?.userId;
    if (!memberId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const result = await isCurrentYearCapitalPaidForMember({ memberId });

    return res.json({
      status: true,
      message: "Capital payment status fetched",
      data: result,
    });
  } catch (err) {
    console.error("isMyCurrentYearCapitalPaidController error:", err);
    return res.status(err.statusCode || 500).json({
      status: false,
      message: err.message || "Error checking capital payment",
    });
  }
}

/**
 * CRON (ADMIN/internal): POST /admin/capital/cron/generate-year
 * Body: { year?, amountPerMember? }
 */
export async function cronGenerateAnnualCapitalController(req, res) {
  try {
    const { year, amountPerMember } = req.body || {};

    const result = await ensureAnnualCapitalForAllMembers({
      year,
      amountPerMember,
    });

    return res.json({
      status: true,
      message: "Annual capital ensured for all members",
      data: result,
    });
  } catch (err) {
    console.error("cronGenerateAnnualCapitalController error:", err);
    return res.status(err.statusCode || 500).json({
      status: false,
      message: err.message || "Error generating annual capital",
    });
  }
}

/**
 * INTERNAL (called from user service when a member registers after Jan)
 * Not an HTTP controller, but you can call the service:
 *
 * await ensureCapitalForNewMemberOnRegistration({ memberId: user._id });
 */
export { ensureCapitalForNewMemberOnRegistration };

export async function getCapitalByIdController(req, res) {
  try {
    const { id } = req.params;

    const capital = await getCapitalById({ capitalId: id });

    return res.json({
      status: true,
      message: "Capital fetched successfully",
      data: { capital },
    });
  } catch (err) {
    console.error("getCapitalByIdController error:", err);

    return res.status(err.statusCode || 500).json({
      status: false,
      message: err.message || "Error fetching capital record",
    });
  }
}

export async function getMyCurrentYearCapitalController(req, res) {
  try {
    const memberId = req.payload?.userId;
    if (!memberId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const capital = await getCurrentYearCapitalForMember(memberId);
    const year = new Date().getFullYear();

    return res.json({
      status: true,
      message: capital
        ? `Capital record for year ${year} fetched successfully`
        : `No capital record found for year ${year}`,
      data: { capital },
    });
  } catch (err) {
    console.error("getMyCurrentYearCapitalController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while fetching current year capital.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

export async function ensureMyCapitalForCurrentYearController(req, res) {
  try {
    const memberId = req.payload?.userId;
    if (!memberId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const currentYear = new Date().getFullYear();

    const capital = await ensureCapitalForMemberYear({
      memberId,
      year: currentYear,
    });

    return res.json({
      status: true,
      message: "Capital ensured for current year",
      data: { capital },
    });
  } catch (err) {
    console.error("ensureMyCapitalForCurrentYearController:", err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      status: false,
      message: err.message || "Failed to ensure capital",
    });
  }
}
