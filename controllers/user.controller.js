// controllers/user.controller.js

import {
  registerClientService,
  createShadowClientService,
  updateUserProfileService,
  deleteUserService,
  requestUserUpgradeService,
  loginService,
  getUserByNumberService,
  listAllUsersService,
} from "../services/user.service.js";

/**
 * POST /login
 * Body (form-data):
 *  - identifier (phone or email)
 *  - password
 */
export async function login(req, res) {
  try {
    const { identifier, password } = req.body || {};

    const result = await loginService({ identifier, password });

    return res.status(200).json({
      status: true,
      message: "Login successful",
      data: result,
    });
  } catch (err) {
    console.error("Error in login:", err);

    if (err.code === "LOGIN_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "Identifier and password are required",
      });
    }

    if (err.code === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        status: false,
        message: "Invalid phone/email or password",
      });
    }

    if (err.code === "TOKEN_ERROR") {
      return res.status(500).json({
        status: false,
        message: "Could not generate authentication token",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error during login",
    });
  }
}

/**
 * POST /client/register
 * Body (form-data):
 *  - phone (required)
 *  - email (optional)
 *  - password (optional)
 *  - firstName (required)
 *  - lastName (required)
 */
export async function registerClient(req, res) {
  try {
    const { phone, email, password, firstName, lastName } = req.body || {};

    const { user, wallet } = await registerClientService({
      phone,
      email,
      password,
      firstName,
      lastName,
    });

    return res.status(201).json({
      status: true,
      message: "Client registered successfully",
      data: {
        user,
        wallet,
      },
    });
  } catch (err) {
    console.error("Error in registerClient:", err);

    if (err.code === "PHONE_REQUIRED") {
      return res.status(400).json({
        status: false,
        field: "phone",
        message: "Phone is required",
      });
    }

    if (err.code === "NAME_REQUIRED") {
      return res.status(400).json({
        status: false,
        field: "name",
        message: "First and last name are required",
      });
    }

    if (err.code === "PHONE_EXISTS") {
      return res.status(409).json({
        status: false,
        field: "phone",
        message: "This phone number is already used",
      });
    }

    if (err.code === "EMAIL_EXISTS") {
      return res.status(409).json({
        status: false,
        field: "email",
        message: "This email is already used",
      });
    }

    if (err.code === "ROLE_NOT_FOUND") {
      return res.status(500).json({
        status: false,
        message: "CLIENT role not found. Please seed roles.",
      });
    }

    if (err.code === "HASH_ERROR") {
      return res.status(500).json({
        status: false,
        message: "Could not hash password",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error during registration",
    });
  }
}

/**
 * POST /users/shadow
 * Body (form-data):
 *  - phone (required)
 *  - firstName (optional)
 *  - lastName (optional)
 *
 * Typically used by internal flows (transfers) to create a minimal user.
 */
export async function createShadowClient(req, res) {
  try {
    const { phone, firstName, lastName } = req.body || {};

    const user = await createShadowClientService(phone, {
      firstName,
      lastName,
    });

    return res.status(201).json({
      status: true,
      message: "Shadow client created or returned",
      data: user,
    });
  } catch (err) {
    console.error("Error in createShadowClient:", err);

    if (err.code === "PHONE_REQUIRED") {
      return res.status(400).json({
        status: false,
        field: "phone",
        message: "Phone is required",
      });
    }

    if (err.code === "ROLE_NOT_FOUND") {
      return res.status(500).json({
        status: false,
        message: "CLIENT role not found. Please seed roles.",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error during shadow client creation",
    });
  }
}

/**
 * PATCH /users/me/profile
 * Auth: jwtVerify (req.payload.userId)
 * Body (form-data):
 *  - firstName?, lastName?, email?, phone?
 */
export async function updateMyProfile(req, res) {
  try {
    const userId = req.payload?.userId;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: missing user",
      });
    }

    const updated = await updateUserProfileService(userId, req.body || {});

    return res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Error in updateMyProfile:", err);

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while updating profile",
    });
  }
}

/**
 * DELETE /users/:userId
 * Auth: requireRole("ADMIN") at route level
 */
export async function deleteUser(req, res) {
  try {
    const adminId = req.payload?.userId;
    const { userId } = req.params;

    const result = await deleteUserService(adminId, userId);

    return res.status(200).json({
      status: true,
      message: "User deleted successfully",
      data: result,
    });
  } catch (err) {
    console.error("Error in deleteUser:", err);

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error while deleting user",
    });
  }
}

/**
 * POST /users/upgrade-request
 * Auth: jwtVerify
 * Used when a CLIENT requests upgrade to MEMBER.
 */
export async function requestUserUpgrade(req, res) {
  try {
    const userId = req.payload?.userId;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: missing user",
      });
    }

    const result = await requestUserUpgradeService(userId);

    return res.status(200).json({
      status: true,
      message: "Upgrade request submitted",
      data: result,
    });
  } catch (err) {
    console.error("Error in requestUserUpgrade:", err);

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

    return res.status(500).json({
      status: false,
      message: "Server error while requesting upgrade",
    });
  }
}

export async function getUserByPhone(req, res) {
  try {
    const { phone } = req.body || {};

    const result = await getUserByNumberService({ phone });

    return res.status(200).json({
      status: true,
      message: "User fetched successfully",
      data: result,
    });
  } catch (err) {
    console.error("Error in login:", err);

    if (err.code === "PHONE_REQUIRED") {
      return res.status(400).json({
        status: false,
        message: "Phone number is required",
      });
    }

    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        status: false,
        message: err.message,
      });
    }

    return res.status(500).json({
      status: false,
      message: "Server error during fetching user by phone",
    });
  }
}

export async function listAllUsers(req, res) {
  try {
    const users = await listAllUsersService();

    return res.status(200).json({
      status: true,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (err) {
    console.error("LIST USERS ERROR:", err);
    return res.status(500).json({
      status: false,
      message: "Server error fetching users",
    });
  }
}
