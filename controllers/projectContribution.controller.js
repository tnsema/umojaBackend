// controllers/projectContribution.controller.js

import {
  createProjectContributionService,
  listProjectContributionsService,
} from "../services/projectContribution.service.js";

/**
 * POST /project-contributions
 *
 * Body (form-data):
 *  - projectId
 *  - memberId
 *  - amount
 *  - walletTxId
 *  - method? ("WALLET" | "POP") default "WALLET"
 *
 * Auth: jwtVerify + requireRole("MEMBER", "ADMIN") (configure at route level)
 */
export async function createProjectContribution(req, res) {
  try {
    const { projectId, memberId, amount, walletTxId, method } = req.body || {};

    const result = await createProjectContributionService({
      projectId,
      memberId,
      amount,
      walletTxId,
      method,
    });

    return res.status(201).json({
      status: true,
      message: "Project contribution created successfully",
      data: result,
    });
  } catch (err) {
    console.error("Error in createProjectContribution:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "projectId, memberId, amount and walletTxId are required",
      });
    }

    if (err.code === "INVALID_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid projectId, memberId or walletTxId",
      });
    }

    if (err.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Project not found",
      });
    }

    if (err.code === "MEMBER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Member not found",
      });
    }

    if (err.code === "WALLET_TX_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Wallet transaction not found",
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
        message: "Invalid contribution method (must be WALLET or POP)",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while creating project contribution",
    });
  }
}

/**
 * GET /projects/:projectId/contributions
 *
 * Auth: jwtVerify + requireRole("ADMIN", "PROJECT_MANAGER", "MEMBER")
 * (You can restrict as you like)
 */
export async function listProjectContributions(req, res) {
  try {
    const { projectId } = req.params;

    const contributions = await listProjectContributionsService(projectId);

    return res.status(200).json({
      status: true,
      data: contributions,
    });
  } catch (err) {
    console.error("Error in listProjectContributions:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "projectId is required",
      });
    }

    if (err.code === "INVALID_PROJECT_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid projectId",
      });
    }

    if (err.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Project not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while listing project contributions",
    });
  }
}
