// services/auth.service.js
// Business logic for registration + login (no JSON assumption, just plain objects).

import Models from "../model/model.js";
import { generatePassword, comparePassword } from "../helper/bcrypt.js";
import { jwtSign } from "../helper/jwtVerify.js";

const { user: User, role: Role, wallet: Wallet } = Models;

/**
 * Register a full client (with password).
 * Called by controller with plain fields (already validated for presence).
 */
export async function registerClientService({
  phone,
  email,
  password,
  firstName,
  lastName,
}) {
  // 1) Check duplicates for phone
  const existingByPhone = await User.findOne({ phone });
  if (existingByPhone) {
    const err = new Error("Phone number is already registered");
    err.code = "PHONE_EXISTS";
    throw err;
  }

  // 2) If email provided, check duplicates for email
  if (email) {
    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
      const err = new Error("Email is already registered");
      err.code = "EMAIL_EXISTS";
      throw err;
    }
  }

  // 3) Find CLIENT role
  const clientRole = await Role.findOne({ name: "CLIENT" });
  if (!clientRole) {
    const err = new Error("CLIENT role not found. Seed roles first.");
    err.code = "ROLE_NOT_FOUND";
    throw err;
  }

  // 4) Hash password using your helper
  let hashedPassword = null;

  // Only hash if password is provided (full client)
  if (password && typeof password === "string" && password.trim() !== "") {
    const { passwordStatus, hash } = generatePassword(password);

    if (!passwordStatus || !hash) {
      const err = new Error("Could not hash password");
      err.code = "HASH_ERROR";
      throw err;
    }

    hashedPassword = hash;
  }

  // 5) Create user
  const user = await User.create({
    phone,
    email: email || null,
    passwordHash: hashedPassword,
    firstName,
    lastName,
    roles: [clientRole._id],
    status: "PENDING_KYC",
  });

  // 6) Create wallet with zero balance
  let wallet = null;
  if (Wallet) {
    wallet = await Wallet.create({
      userId: user._id,
      balance: 0,
      currency: "ZAR",
    });
  }

  const safeUser = {
    _id: user._id,
    phone: user.phone,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    status: user.status,
    createdAt: user.createdAt,
  };

  return { user: safeUser, wallet };
}

/**
 * Login with phone OR email as identifier.
 */
export async function loginService({ identifier, password }) {
  // 1) Find user by phone or email
  const user = await User.findOne({
    $or: [{ phone: identifier }, { email: identifier }],
  }).populate("roles");

  if (!user) {
    const err = new Error("Invalid credentials");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  // 2) If this is a shadow account with no password yet
  if (!user.passwordHash) {
    const err = new Error("This account has not completed registration yet.");
    err.code = "NO_PASSWORD_SET";
    throw err;
  }

  // 3) Compare password using helper
  const { passwordStatus } = comparePassword(password, user.passwordHash);
  if (!passwordStatus) {
    const err = new Error("Invalid credentials");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  if (user.status === "SUSPENDED") {
    const err = new Error("Account is suspended. Contact support.");
    err.code = "ACCOUNT_SUSPENDED";
    throw err;
  }

  // 4) Build JWT payload
  // Extract role names (whether populated or only IDs)
  const roleNames = user.roles
    .map((r) =>
      typeof r === "string" || (typeof r === "object" && !r.name)
        ? null
        : r.name
    )
    .filter(Boolean);

  // If not populated, fetch names manually
  if (roleNames.length === 0) {
    const fullRoles = await Role.find({ _id: { $in: user.roles } });
    roleNames.push(...fullRoles.map((r) => r.name));
  }

  const payloadToSign = {
    userId: user._id,
    roles: roleNames, // <-- NOW NAMES
  };

  const authToken = jwtSign(payloadToSign);
  if (!authToken) {
    const err = new Error("Could not generate auth token");
    err.code = "TOKEN_ERROR";
    throw err;
  }

  const safeUser = {
    _id: user._id,
    phone: user.phone,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: roleNames,
    status: user.status,
    createdAt: user.createdAt,
  };

  return { authToken, user: safeUser };
}
