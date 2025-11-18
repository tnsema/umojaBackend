// controllers/auth.controller.js
// Thin HTTP layer, assumes form-data (parsed by multer.none()).

import {
  registerClientService,
  loginService,
} from "../services/auth.service.js";

/**
 * POST /client/register
 * Form-data fields (all as text):
 *  - phone (required)
 *  - email (optional)
 *  - password (required)
 *  - firstName (required)
 *  - lastName (required)
 */
export async function registerClient(req, res) {
  try {
    const { phone, email, password, firstName, lastName } = req.body || {};

    // Handle each missing field alone (first one we hit)
    if (!phone) {
      return res.status(400).json({
        status: false,
        field: "phone",
        message: "Phone is required",
      });
    }

    /*
    if (!password) {
      return res.status(400).json({
        status: false,
        field: "password",
        message: "Password is required",
      });
    }
      */

    if (!firstName) {
      return res.status(400).json({
        status: false,
        field: "firstName",
        message: "First name is required",
      });
    }

    if (!lastName) {
      return res.status(400).json({
        status: false,
        field: "lastName",
        message: "Last name is required",
      });
    }

    // Call service
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
      data: { user, wallet },
    });
  } catch (err) {
    console.error("Error in registerClient:", err);

    // Map each service error separately
    if (err.code === "PHONE_EXISTS") {
      return res.status(409).json({
        status: false,
        field: "phone",
        message: "Phone number is already registered",
      });
    }

    if (err.code === "EMAIL_EXISTS") {
      return res.status(409).json({
        status: false,
        field: "email",
        message: "Email is already registered",
      });
    }

    if (err.code === "ROLE_NOT_FOUND") {
      return res.status(500).json({
        status: false,
        message: "CLIENT role not found. Please seed roles first.",
      });
    }

    if (err.code === "HASH_ERROR") {
      return res.status(500).json({
        status: false,
        message: "Error while hashing password",
      });
    }

    // Fallback unexpected error
    return res.status(500).json({
      status: false,
      message: "Server error while registering client",
    });
  }
}

/**
 * POST /login
 * Form-data fields:
 *  - identifier (phone or email)
 *  - password
 */
export async function login(req, res) {
  try {
    const { identifier, password } = req.body || {};

    if (!identifier) {
      return res.status(400).json({
        status: false,
        field: "identifier",
        message: "Identifier (phone or email) is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        status: false,
        field: "password",
        message: "Password is required",
      });
    }

    const { authToken, user } = await loginService({ identifier, password });

    return res.json({
      status: true,
      message: "Login successful",
      data: {
        authToken,
        user,
      },
    });
  } catch (err) {
    console.error("Error in login:", err);

    if (err.code === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        status: false,
        field: "identifier",
        message: "Invalid phone/email or password",
      });
    }

    if (err.code === "NO_PASSWORD_SET") {
      return res.status(403).json({
        status: false,
        message:
          "This account has not completed registration yet. Please complete registration to set a password.",
      });
    }

    if (err.code === "ACCOUNT_SUSPENDED") {
      return res.status(403).json({
        status: false,
        message: "Account is suspended. Contact support.",
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
      message: "Server error while logging in",
    });
  }
}
