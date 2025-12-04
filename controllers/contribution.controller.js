// controllers/contribution.controller.js

import {
  createContribution as createContributionService,
  getUserContributionsByYear,
  getUserContributionByYearMonth,
  getAllContributionsForUser,
  getAllContributions,
  deleteContribution as deleteContributionService,
  updateContributionStatus,
  markContributionPaid,
  getUserPaidTotalForYear,
  calculateYearEndPayouts,
  ensureYearlyContributionsForMember,
  getContributionById,
} from "../services/contribution.service.js";

/**
 * POST /contributions
 * Logged-in member creates a contribution.
 * Body: { amount, month, year }
 * Admin can optionally pass memberId in body to create for someone else.
 */
export async function createContributionController(req, res) {
  try {
    const authUserId = req.payload?.userId;
    if (!authUserId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const { amount, month, year, memberId } = req.body;

    const contribution = await createContributionService({
      memberId: memberId || authUserId,
      amount,
      month,
      year,
    });

    return res.status(201).json({
      status: true,
      message: "Contribution created successfully",
      data: { contribution },
    });
  } catch (err) {
    console.error("createContributionController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while creating contribution.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /contributions/me/year/:year
 * Get contributions for logged-in user for a given year
 */
export async function getMyContributionsByYearController(req, res) {
  try {
    const memberId = req.payload?.userId;
    if (!memberId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const { year } = req.params;
    const result = await getUserContributionsByYear({ memberId, year });

    return res.json({
      status: true,
      message: "Contributions fetched successfully",
      data: result,
    });
  } catch (err) {
    console.error("getMyContributionsByYearController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while fetching contributions for the year.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /contributions/me/year/:year/month/:month
 * Single month contribution for logged-in user
 */
export async function getMyContributionByYearMonthController(req, res) {
  try {
    const memberId = req.payload?.userId;
    if (!memberId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const { year, month } = req.params;
    const contribution = await getUserContributionByYearMonth({
      memberId,
      year,
      month,
    });

    return res.json({
      status: true,
      message: "Contribution fetched successfully",
      data: { contribution },
    });
  } catch (err) {
    console.error("getMyContributionByYearMonthController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while fetching the contribution.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /contributions/me
 * All contributions for logged-in user (optional query: year, status)
 */
export async function getMyAllContributionsController(req, res) {
  try {
    const memberId = req.payload?.userId;
    if (!memberId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const { year, status } = req.query;
    const items = await getAllContributionsForUser({
      memberId,
      year,
      status,
    });

    return res.json({
      status: true,
      message: "Contributions fetched successfully",
      data: items,
    });
  } catch (err) {
    console.error("getMyAllContributionsController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while fetching contributions.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: GET /admin/users/:userId/contributions
 * Optional query: year, status
 */
export async function getUserContributionsAdminController(req, res) {
  try {
    const { userId } = req.params;
    const { year, status } = req.query;

    const items = await getAllContributionsForUser({
      memberId: userId,
      year,
      status,
    });

    return res.json({
      status: true,
      message: "User contributions fetched successfully",
      data: items,
    });
  } catch (err) {
    console.error("getUserContributionsAdminController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while fetching user contributions.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: GET /admin/contributions
 * Query: page, limit, memberId, year, status
 */
export async function getAllContributionsAdminController(req, res) {
  try {
    const { page, limit, memberId, year, status } = req.query;

    const result = await getAllContributions({
      page,
      limit,
      memberId,
      year,
      status,
    });

    return res.json({
      status: true,
      message: "All contributions fetched successfully",
      data: result,
    });
  } catch (err) {
    console.error("getAllContributionsAdminController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while fetching all contributions.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: DELETE /admin/contributions/:id
 */
export async function deleteContributionController(req, res) {
  try {
    const { id } = req.params;

    const result = await deleteContributionService(id);

    return res.json({
      status: true,
      message: "Contribution deleted successfully",
      data: result,
    });
  } catch (err) {
    console.error("deleteContributionController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while deleting the contribution.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: PATCH /admin/contributions/:id/status
 * Body: { status: "PENDING" | "PAID" }
 */
export async function updateContributionStatusController(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body ?? {};

    if (!status) {
      return res.status(400).json({
        status: false,
        message: "Field 'status' is required",
      });
    }

    const contribution = await updateContributionStatus(id, status);

    return res.json({
      status: true,
      message: "Contribution status updated successfully",
      data: { contribution },
    });
  } catch (err) {
    console.error("updateContributionStatusController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while updating contribution status.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: POST /admin/contributions/:id/mark-paid
 */
export async function markContributionPaidController(req, res) {
  try {
    const { id } = req.params;

    const contribution = await markContributionPaid(id);

    return res.json({
      status: true,
      message: "Contribution marked as PAID",
      data: { contribution },
    });
  } catch (err) {
    console.error("markContributionPaidController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while marking contribution as paid.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /contributions/me/summary/:year
 * Total PAID contributions for logged-in user in a year
 */
export async function getMyPaidTotalForYearController(req, res) {
  try {
    const memberId = req.payload?.userId;
    if (!memberId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const { year } = req.params;
    const summary = await getUserPaidTotalForYear({ memberId, year });

    return res.json({
      status: true,
      message: "Paid total calculated successfully",
      data: summary,
    });
  } catch (err) {
    console.error("getMyPaidTotalForYearController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while calculating total paid.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: GET /admin/users/:userId/contributions/summary/:year
 */
export async function getUserPaidTotalForYearAdminController(req, res) {
  try {
    const { userId, year } = req.params;
    const summary = await getUserPaidTotalForYear({
      memberId: userId,
      year,
    });

    return res.json({
      status: true,
      message: "User paid total calculated successfully",
      data: summary,
    });
  } catch (err) {
    console.error("getUserPaidTotalForYearAdminController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while calculating user total paid.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * ADMIN: GET /admin/contributions/payouts/:year
 * Skeleton for year-end payout calculation
 */
export async function calculateYearEndPayoutsController(req, res) {
  try {
    const { year } = req.params;

    const payouts = await calculateYearEndPayouts(year);

    return res.json({
      status: true,
      message: "Year-end payout skeleton calculated successfully",
      data: payouts,
    });
  } catch (err) {
    console.error("calculateYearEndPayoutsController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while calculating year-end payouts.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

export async function ensureMyYearlyContributionsController(req, res) {
  try {
    const memberId = req.payload?.userId;

    if (!memberId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    // year can come from body or query; default to current year
    const yearFromBody = req.body?.year;
    const yearFromQuery = req.query?.year;
    const year = yearFromBody || yearFromQuery || new Date().getFullYear();

    const result = await ensureYearlyContributionsForMember({
      memberId,
      year,
      // optional overrides if you ever want them from body:
      // amountPerMonth: req.body?.amountPerMonth,
      // startMonth: req.body?.startMonth,
      // endMonth: req.body?.endMonth,
    });

    return res.status(201).json({
      status: true,
      message: `Yearly contributions ensured for year ${result.year}`,
      data: result,
    });
  } catch (err) {
    console.error("ensureMyYearlyContributionsController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while ensuring yearly contributions.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

export async function getMyContributionByIdController(req, res) {
  try {
    const memberId = req.payload?.userId;
    const { id } = req.params;

    const contribution = await getContributionById(id, { memberId });

    return res.json({
      status: true,
      message: "Contribution fetched successfully",
      data: contribution,
    });
  } catch (err) {
    console.error("getMyContributionByIdController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while fetching the contribution.";

    return res.status(statusCode).json({ status: false, message });
  }
}

export async function getContributionByIdAdminController(req, res) {
  try {
    const { id } = req.params;

    const contribution = await getContributionById(id, { forAdmin: true });

    return res.json({
      status: true,
      message: "Contribution fetched successfully",
      data: contribution,
    });
  } catch (err) {
    console.error("getContributionByIdAdminController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while fetching the contribution.";

    return res.status(statusCode).json({ status: false, message });
  }
}
