// controllers/role.controller.js
// HTTP layer for role management.

import {
  createRoleService,
  listRolesService,
  assignRoleToUserService,
  removeRoleFromUserService,
} from "../services/role.service.js";

/**
 * POST /roles
 * Body (form-data):
 *  - name        (e.g. "ADMIN")
 *  - label       (e.g. "Administrator")
 *  - description (optional)
 *
 * Auth: jwtVerify + requireRole("ADMIN") at route level.
 */
export async function createRole(req, res) {
  try {
    const { name, label, description } = req.body || {};

    const role = await createRoleService({ name, label, description });

    return res.status(201).json({
      status: true,
      message: "Role created successfully",
      data: role,
    });
  } catch (err) {
    console.error("Error in createRole:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "Name and label are required",
      });
    }

    if (err.code === "ROLE_EXISTS") {
      return res.status(409).json({
        status: false,
        message: "A role with this name already exists",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while creating role",
    });
  }
}

/**
 * GET /roles
 * Auth: jwtVerify + requireRole("ADMIN") (or relax if you want public list)
 */
export async function listRoles(req, res) {
  try {
    const roles = await listRolesService();

    return res.status(200).json({
      status: true,
      data: roles,
    });
  } catch (err) {
    console.error("Error in listRoles:", err);

    return res.status(500).json({
      status: false,
      message: "Server error while fetching roles",
    });
  }
}

/**
 * POST /roles/assign
 * Body (form-data):
 *  - userId
 *  - roleName  (e.g. "ADMIN", "MEMBER")
 *
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function assignRoleToUser(req, res) {
  try {
    const { userId, roleName } = req.body || {};

    const user = await assignRoleToUserService({ userId, roleName });

    return res.status(200).json({
      status: true,
      message: "Role assigned to user successfully",
      data: user,
    });
  } catch (err) {
    console.error("Error in assignRoleToUser:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "userId and roleName are required",
      });
    }

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (err.code === "ROLE_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Role not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while assigning role",
    });
  }
}

/**
 * POST /roles/remove
 * Body (form-data):
 *  - userId
 *  - roleName  (e.g. "ADMIN", "MEMBER")
 *
 * Auth: jwtVerify + requireRole("ADMIN")
 */
export async function removeRoleFromUser(req, res) {
  try {
    const { userId, roleName } = req.body || {};

    const user = await removeRoleFromUserService({ userId, roleName });

    return res.status(200).json({
      status: true,
      message: "Role removed from user successfully",
      data: user,
    });
  } catch (err) {
    console.error("Error in removeRoleFromUser:", err);

    if (err.code === "FIELDS_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "userId and roleName are required",
      });
    }

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (err.code === "ROLE_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "Role not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while removing role",
    });
  }
}
