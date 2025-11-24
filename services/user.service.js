// services/user.service.js
// Business logic for user registration, login, profile updates, etc.

import Models from "../model/model.js";
import { generatePassword, comparePassword } from "../helper/bcrypt.js";
import { jwtSign } from "../helper/jwtVerify.js";
import { createWalletForUserService } from "../services/wallet.service.js";

const { user: User, role: Role, wallet: Wallet } = Models;

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

  const userId = user._id;
  const currency = "ZAR";

  const wallet = await createWalletForUserService(userId, currency);

  return { user, wallet };
}

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

  const userId = user._id;
  const currency = "ZAR";

  const wallet = await createWalletForUserService(userId, currency);

  return user;
}

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

  await user.save();
  return user;
}

export async function deleteUserService(adminId, userId) {
  // TODO: Optionally verify adminId and log audit
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  await User.deleteOne({ _id: userId });

  return { deleted: true };
}

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

  return {
    userId: user._id,
    message: "Upgrade request recorded (implement notification flow).",
  };
}

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

export async function getUserByNumberService({ phone }) {
  if (!phone) {
    const err = new Error("Phone number is required");
    err.code = "PHONE_REQUIRED";
    throw err;
  }

  const user = await User.findOne({ phone: phone }).populate("roles");

  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  return {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      roles: (user.roles || []).map((r) => r.name),
      status: user.status,
    },
  };
}

export async function listAllUsersService() {
  const users = await User.find()
    .select("_id firstName lastName phone email roles status")
    .lean();

  return users;
}
