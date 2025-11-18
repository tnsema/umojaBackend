// services/user.service.js
// Business logic for user registration, login, profile updates, etc.

import Models from "../model/model.js";
import { generatePassword, comparePassword } from "../helper/bcrypt.js";
import { jwtSign } from "../helper/jwtVerify.js";
import { createWalletForUserService } from "../services/wallet.service.js";

const { user: User, role: Role, wallet: Wallet } = Models;

/**
 * registerClient(payload)
 *
 * Used when a new client registers (self-registration or created by admin).
 * - phone (required, unique)
 * - email (optional, unique if provided)
 * - password (optional – if omitted, user can set later)
 * - firstName, lastName (required)
 */
export async function registerClientService(payload) {
  const { phone, email, password, firstName, lastName } = payload || {};

  // Basic validation
  if (!phone) {
    const err = new Error("Phone is required");
    err.code = "PHONE_REQUIRED";
    throw err;
  }

  if (!firstName || !lastName) {
    const err = new Error("First name and last name are required");
    err.code = "NAME_REQUIRED";
    throw err;
  }

  // Check if phone or email already used
  const existingByPhone = await User.findOne({ phone });
  if (existingByPhone) {
    const err = new Error("Phone already in use");
    err.code = "PHONE_EXISTS";
    throw err;
  }

  if (email) {
    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
      const err = new Error("Email already in use");
      err.code = "EMAIL_EXISTS";
      throw err;
    }
  }

  // Find CLIENT role
  const clientRole = await Role.findOne({ name: "CLIENT" });
  if (!clientRole) {
    const err = new Error("CLIENT role not found. Please seed roles first.");
    err.code = "ROLE_NOT_FOUND";
    throw err;
  }

  // Optional password hashing
  let passwordHash = null;
  if (password) {
    const { passwordStatus, hash } = generatePassword(password);
    if (!passwordStatus) {
      const err = new Error("Could not hash password");
      err.code = "HASH_ERROR";
      throw err;
    }
    passwordHash = hash;
  }

  // Create user
  const user = await User.create({
    phone,
    email: email || null,
    passwordHash,
    firstName,
    lastName,
    roles: [clientRole._id],
    status: "PENDING_KYC",
  });

  // Create wallet for this user (starting at 0)
  /*const wallet = await Wallet.create({
    userId: user._id,
    balance: 0,
    currency: "USD",
  });*/

  const userId = user._id;
  const currency = "USD";

  const wallet = await createWalletForUserService(userId, currency);

  return { user, wallet };
}

/**
 * createShadowClient(phone, minimalData)
 *
 * Used when someone sends money to a phone that doesn't exist yet.
 * - No password
 * - CLIENT role
 * - PENDING_KYC
 */
export async function createShadowClientService(phone, minimalData = {}) {
  if (!phone) {
    const err = new Error("Phone is required");
    err.code = "PHONE_REQUIRED";
    throw err;
  }

  // If user already exists, just return it
  let user = await User.findOne({ phone });
  if (user) {
    return user;
  }

  const clientRole = await Role.findOne({ name: "CLIENT" });
  if (!clientRole) {
    const err = new Error("CLIENT role not found");
    err.code = "ROLE_NOT_FOUND";
    throw err;
  }

  const { firstName = "", lastName = "" } = minimalData;

  user = await User.create({
    phone,
    email: null,
    passwordHash: null,
    firstName,
    lastName,
    roles: [clientRole._id],
    status: "PENDING_KYC",
  });

  /*await Wallet.create({
    userId: user._id,
    balance: 0,
    currency: "CDF",
  });*/

  const userId = user._id;
  const currency = "USD";

  const wallet = await createWalletForUserService(userId, currency);

  return user;
}

/**
 * updateUserProfile(userId, profileData)
 *
 * User updates their personal details (not roles or status).
 */
export async function updateUserProfileService(userId, profileData = {}) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const allowedFields = ["firstName", "lastName", "email", "phone"];
  allowedFields.forEach((field) => {
    if (profileData[field] !== undefined) {
      user[field] = profileData[field];
    }
  });

  // Optional: enforce unique email/phone here as well
  // (left out for brevity – can be added later)

  await user.save();
  return user;
}

/**
 * deleteUser(adminId, userId)
 *
 * For now, only deletes the user (soft-delete or hard-delete depending on your decision).
 * Admin checks should be done in controller or via requireRole("ADMIN").
 */
export async function deleteUserService(adminId, userId) {
  // TODO: Optionally verify adminId and log audit
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  await User.deleteOne({ _id: userId });

  // NOTE: You may also want to:
  // - disable or flag wallets
  // - anonymize data
  // For now, this is a hard delete of the user document.

  return { deleted: true };
}

/**
 * requestUserUpgrade(userId)
 *
 * When a CLIENT wants to become a MEMBER.
 * For now, we will:
 *  - ensure user exists
 *  - ensure not already MEMBER
 *  - (optionally) create a notification or flag
 *
 * You can later extend this to create a MembershipUpgradeRequest document.
 */
export async function requestUserUpgradeService(userId) {
  const user = await User.findById(userId).populate("roles");
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const roleNames = (user.roles || []).map((r) => r.name);
  if (roleNames.includes("MEMBER")) {
    const err = new Error("User is already a member");
    err.code = "ALREADY_MEMBER";
    throw err;
  }

  // Minimal implementation: you can integrate with NotificationService later
  // Example: create a notification for admins
  // For now, we simply return user and a flag.
  return {
    userId: user._id,
    message: "Upgrade request recorded (implement notification flow).",
  };
}

/**
 * login()
 *
 * Central login using phone OR email + password.
 * - identifier (phone or email)
 * - password
 *
 * Returns:
 *  - authToken (JWT)
 *  - user (sanitized)
 */
export async function loginService({ identifier, password }) {
  if (!identifier || !password) {
    const err = new Error("Identifier and password are required");
    err.code = "LOGIN_REQUIRED";
    throw err;
  }

  // Find user by phone or email
  const user = await User.findOne({
    $or: [{ phone: identifier }, { email: identifier }],
  }).populate("roles");

  if (!user || !user.passwordHash) {
    const err = new Error("Invalid credentials");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  const { passwordStatus } = comparePassword(password, user.passwordHash);
  if (!passwordStatus) {
    const err = new Error("Invalid credentials");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  const roleNames = (user.roles || []).map((r) => r.name).filter(Boolean);

  const payloadToSign = {
    userId: user._id,
    roles: roleNames,
  };

  const authToken = jwtSign(payloadToSign);
  if (!authToken) {
    const err = new Error("Could not create auth token");
    err.code = "TOKEN_ERROR";
    throw err;
  }

  const safeUser = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    roles: roleNames,
    status: user.status,
  };

  return {
    authToken,
    user: safeUser,
  };
}
