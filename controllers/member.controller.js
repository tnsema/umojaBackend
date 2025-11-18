// controllers/member.controller.js
// HTTP layer for membership operations.

import {
  upgradeClientToMemberService,
  assignMemberAdminRoleService,
  assignMemberAsProjectManagerService,
} from "../services/member.service.js";

/**
 * POST /members/:userId/upgrade
 * Auth: jwtVerify + requireRole("ADMIN") at route level
 */
export async function upgradeClientToMember(req, res) {
  try {
    const adminId = req.payload?.userId;
    if (!adminId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: missing admin",
      });
    }

    const { userId } = req.params;

    const result = await upgradeClientToMemberService({ adminId, userId });

    return res.status(200).json({
      status: true,
      message: "Client successfully upgraded to member",
      data: result,
    });
  } catch (err) {
    console.error("Error in upgradeClientToMember:", err);

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (err.code === "ALREADY_MEMBER") {
      return res.status(400).json({
        status: false,
        message: "User is already a member",
      });
    }

    if (err.code === "NOT_CLIENT") {
      return res.status(400).json({
        status: false,
        message: "User must be a client before becoming a member",
      });
    }

    if (err.code === "PROFILE_EXISTS") {
      return res.status(400).json({
        status: false,
        message: "Member profile already exists for this user",
      });
    }

    if (err.code === "ROLE_NOT_FOUND") {
      return res.status(500).json({
        status: false,
        message: "MEMBER role not found. Please seed roles.",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while upgrading client to member",
    });
  }
}

/**
 * POST /members/:userId/make-admin
 * Auth: jwtVerify + requireRole("ADMIN") at route level
 */
export async function assignMemberAdminRole(req, res) {
  try {
    const adminId = req.payload?.userId;
    if (!adminId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: missing admin",
      });
    }

    const { userId } = req.params;

    const user = await assignMemberAdminRoleService({ adminId, userId });

    return res.status(200).json({
      status: true,
      message: "Member granted admin role successfully",
      data: user,
    });
  } catch (err) {
    console.error("Error in assignMemberAdminRole:", err);

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (err.code === "NOT_MEMBER") {
      return res.status(400).json({
        status: false,
        message: "User must be a member to become admin",
      });
    }

    if (err.code === "ROLE_NOT_FOUND") {
      return res.status(500).json({
        status: false,
        message: "ADMIN role not found. Please seed roles.",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while assigning admin role",
    });
  }
}

/**
 * POST /members/:memberId/make-project-manager
 * Auth: jwtVerify + requireRole("ADMIN") at route level
 */
export async function assignMemberAsProjectManager(req, res) {
  try {
    const adminId = req.payload?.userId;
    if (!adminId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: missing admin",
      });
    }

    const { memberId } = req.params;

    const user = await assignMemberAsProjectManagerService({
      adminId,
      memberId,
    });

    return res.status(200).json({
      status: true,
      message: "Member granted project manager role successfully",
      data: user,
    });
  } catch (err) {
    console.error("Error in assignMemberAsProjectManager:", err);

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (err.code === "NOT_MEMBER") {
      return res.status(400).json({
        status: false,
        message: "User must be a member to become project manager",
      });
    }

    if (err.code === "ROLE_NOT_FOUND") {
      return res.status(500).json({
        status: false,
        message: "PROJECT_MANAGER role not found. Please seed roles.",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while assigning project manager role",
    });
  }
}
