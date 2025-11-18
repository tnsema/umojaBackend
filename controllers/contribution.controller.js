// controllers/contribution.controller.js

import {
  createContributionService,
  markContributionPaidService,
  listMemberContributionsService,
  getContributionsByYearService,
  getContributionsByMonthService,
  getContributionsByYearByMemberService,
} from "../services/contribution.service.js";

/**
 * POST /contributions
 * Body (form-data):
 *  - memberId (optional; if missing, use logged-in userId)
 *  - month
 *  - year
 *  - amount
 *  - method? ("WALLET" | "POP")
 *  - walletTxId? (optional, if already paid via wallet)
 *
 * Auth: jwtVerify (member) or ADMIN (depending on route-level protection)
 */
export async function createContribution(req, res) {
  try {
    let { memberId, month, year, amount, method, walletTxId } = req.body || {};

    // If memberId is not provided, assume current logged-in user
    if (!memberId && req.payload?.userId) {
      memberId = req.payload.userId;
    }

    const contrib = await createContributionService({
      memberId,
      month,
      year,
      amount,
      method,
      walletTxId,
    });

    return res.status(201).json({
      status: true,
      message: "Contribution created successfully",
      data: contrib,
    });
  } catch (err) {
    console.error("Error in createContribution:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "memberId, month, year and amount are required",
      });
    }

    if (err.code === "INVALID_MEMBER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid memberId",
      });
    }

    if (err.code === "MEMBER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Member not found",
      });
    }

    if (err.code === "INVALID_PERIOD") {
      return res.status(400).json({
        status: false,
        message: "Invalid month or year",
      });
    }

    if (err.code === "INVALID_AMOUNT") {
      return res.status(400).json({
        status: false,
        message: "Invalid contribution amount",
      });
    }

    if (err.code === "INVALID_METHOD") {
      return res.status(400).json({
        status: false,
        message: "Invalid contribution method",
      });
    }

    if (err.code === "INVALID_WALLET_TX_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid wallet transaction id",
      });
    }

    if (err.code === "WALLET_TX_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Wallet transaction not found",
      });
    }

    if (err.code === "DUPLICATE_CONTRIBUTION") {
      return res.status(409).json({
        status: false,
        message: "Contribution for this member, month and year already exists",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while creating contribution",
    });
  }
}

/**
 * POST /contributions/:id/mark-paid
 * Body (form-data):
 *  - walletTxId? (optional)
 *
 * Auth: jwtVerify + requireRole("ADMIN") (recommended)
 */
export async function markContributionPaid(req, res) {
  try {
    const { id } = req.params;
    const { walletTxId } = req.body || {};

    const contrib = await markContributionPaidService({
      contributionId: id,
      walletTxId,
    });

    return res.status(200).json({
      status: true,
      message: "Contribution marked as PAID",
      data: contrib,
    });
  } catch (err) {
    console.error("Error in markContributionPaid:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "contributionId is required",
      });
    }

    if (err.code === "INVALID_CONTRIBUTION_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid contribution id",
      });
    }

    if (err.code === "CONTRIBUTION_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Contribution not found",
      });
    }

    if (err.code === "INVALID_WALLET_TX_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid wallet transaction id",
      });
    }

    if (err.code === "WALLET_TX_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Wallet transaction not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while marking contribution PAID",
    });
  }
}

/**
 * GET /contributions/me
 * Auth: jwtVerify
 * Returns contributions of the logged-in member
 */
export async function listMyContributions(req, res) {
  try {
    const memberId = req.payload?.userId;
    if (!memberId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: missing user",
      });
    }

    const list = await listMemberContributionsService(memberId);

    return res.status(200).json({
      status: true,
      data: list,
    });
  } catch (err) {
    console.error("Error in listMyContributions:", err);

    if (err.code === "INVALID_MEMBER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid memberId",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching contributions",
    });
  }
}

/**
 * GET /contributions/member/:memberId
 * Auth: jwtVerify + (ADMIN or same member, enforced at route-level if you want)
 */
export async function listMemberContributions(req, res) {
  try {
    const { memberId } = req.params;

    const list = await listMemberContributionsService(memberId);

    return res.status(200).json({
      status: true,
      data: list,
    });
  } catch (err) {
    console.error("Error in listMemberContributions:", err);

    if (err.code === "INVALID_MEMBER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid memberId",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching member contributions",
    });
  }
}

/**
 * GET /contributions/year/:year
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function getContributionsByYear(req, res) {
  try {
    const { year } = req.params;

    const list = await getContributionsByYearService(year);

    return res.status(200).json({
      status: true,
      data: list,
    });
  } catch (err) {
    console.error("Error in getContributionsByYear:", err);

    if (err.code === "INVALID_YEAR") {
      return res.status(400).json({
        status: false,
        message: "Invalid year",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching contributions by year",
    });
  }
}

/**
 * GET /contributions/month/:month
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function getContributionsByMonth(req, res) {
  try {
    const { month } = req.params;

    const list = await getContributionsByMonthService(month);

    return res.status(200).json({
      status: true,
      data: list,
    });
  } catch (err) {
    console.error("Error in getContributionsByMonth:", err);

    if (err.code === "INVALID_MONTH") {
      return res.status(400).json({
        status: false,
        message: "Invalid month",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while fetching contributions by month",
    });
  }
}

/**
 * GET /contributions/member/:memberId/year/:year
 * Auth: jwtVerify + requireRole("ADMIN") (or same user)
 */
export async function getContributionsByYearByMember(req, res) {
  try {
    const { memberId, year } = req.params;

    const list = await getContributionsByYearByMemberService(memberId, year);

    return res.status(200).json({
      status: true,
      data: list,
    });
  } catch (err) {
    console.error("Error in getContributionsByYearByMember:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "memberId and year are required",
      });
    }

    if (err.code === "INVALID_MEMBER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid memberId",
      });
    }

    if (err.code === "INVALID_YEAR") {
      return res.status(400).json({
        status: false,
        message: "Invalid year",
      });
    }

    return res.status(500).json({
      status: false,
      message:
        "Server error while fetching contributions by year for this member",
    });
  }
}
