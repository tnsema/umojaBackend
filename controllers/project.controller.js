// controllers/project.controller.js

import {
  createProjectService,
  assignProjectManagerService,
  addProjectMemberService,
  updateProjectStatusService,
  updateBalanceService,
} from "../services/project.service.js";

/**
 * POST /projects
 *
 * Body (form-data):
 *  - name
 *  - description?
 *  - requestedByMemberId? (if not given we use logged-in user)
 *
 * Auth: jwtVerify (member who requests project)
 */
export async function createProject(req, res) {
  try {
    const {
      name,
      description,
      requestedByMemberId: bodyRequestedBy,
    } = req.body || {};

    const requestedByMemberId = bodyRequestedBy || req.payload?.userId;

    const project = await createProjectService({
      name,
      description,
      requestedByMemberId,
    });

    return res.status(201).json({
      status: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (err) {
    console.error("Error in createProject:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "name and requestedByMemberId are required",
      });
    }

    if (err.code === "INVALID_USER_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid requestedByMemberId",
      });
    }

    if (err.code === "REQUESTER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Requesting member not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while creating project",
    });
  }
}

/**
 * POST /projects/:projectId/assign-manager
 *
 * Body (form-data):
 *  - memberId
 *
 * Auth: jwtVerify + requireRole("ADMIN") (or appropriate role)
 */
export async function assignProjectManager(req, res) {
  try {
    const { projectId } = req.params;
    const { memberId } = req.body || {};

    const project = await assignProjectManagerService({
      projectId,
      memberId,
    });

    return res.status(200).json({
      status: true,
      message: "Project manager assigned successfully",
      data: project,
    });
  } catch (err) {
    console.error("Error in assignProjectManager:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "projectId and memberId are required",
      });
    }

    if (err.code === "INVALID_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid projectId or memberId",
      });
    }

    if (err.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Project not found",
      });
    }

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while assigning project manager",
    });
  }
}

/**
 * POST /projects/:projectId/add-member
 *
 * Body (form-data):
 *  - memberId
 *
 * Auth: jwtVerify + requireRole("ADMIN", "PROJECT_MANAGER")
 */
export async function addProjectMember(req, res) {
  try {
    const { projectId } = req.params;
    const { memberId } = req.body || {};

    const project = await addProjectMemberService({
      projectId,
      memberId,
    });

    return res.status(200).json({
      status: true,
      message: "Project member added successfully",
      data: project,
    });
  } catch (err) {
    console.error("Error in addProjectMember:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "projectId and memberId are required",
      });
    }

    if (err.code === "INVALID_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid projectId or memberId",
      });
    }

    if (err.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Project not found",
      });
    }

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while adding project member",
    });
  }
}

/**
 * POST /projects/:projectId/status
 *
 * Body (form-data):
 *  - status ("PENDING_APPROVAL" | "ACTIVE" | "ARCHIVED" | "TERMINATED")
 *
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function updateProjectStatus(req, res) {
  try {
    const { projectId } = req.params;
    const { status } = req.body || {};
    const adminId = req.payload?.userId;

    const project = await updateProjectStatusService({
      projectId,
      status,
      adminId,
    });

    return res.status(200).json({
      status: true,
      message: "Project status updated successfully",
      data: project,
    });
  } catch (err) {
    console.error("Error in updateProjectStatus:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "projectId and status are required",
      });
    }

    if (err.code === "INVALID_PROJECT_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid projectId",
      });
    }

    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({
        status: false,
        message:
          "Invalid project status (must be PENDING_APPROVAL, ACTIVE, ARCHIVED or TERMINATED)",
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
      message: "Server error while updating project status",
    });
  }
}

/**
 * POST /projects/:projectId/balance
 *
 * Body (form-data):
 *  - amount
 *  - operation? ("INCREASE" | "DECREASE") default "INCREASE"
 *
 * Auth: jwtVerify + requireRole("ADMIN") (or financial role)
 */
export async function updateBalance(req, res) {
  try {
    const { projectId } = req.params;
    const { amount, operation } = req.body || {};

    const project = await updateBalanceService({
      projectId,
      amount,
      operation,
    });

    return res.status(200).json({
      status: true,
      message: "Project balance updated successfully",
      data: project,
    });
  } catch (err) {
    console.error("Error in updateBalance:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "projectId and amount are required",
      });
    }

    if (err.code === "INVALID_PROJECT_ID") {
      return res.status(400).json({
        status: false,
        message: "Invalid projectId",
      });
    }

    if (err.code === "INVALID_AMOUNT") {
      return res.status(400).json({
        status: false,
        message: "Invalid amount",
      });
    }

    if (err.code === "INVALID_OPERATION") {
      return res.status(400).json({
        status: false,
        message: "Invalid operation (must be INCREASE or DECREASE)",
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
      message: "Server error while updating project balance",
    });
  }
}
