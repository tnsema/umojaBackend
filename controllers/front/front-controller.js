// controllers/front/front-controller.js
import bcrypt from "bcrypt";
import { jwtSign } from "../../helper/jwtVerify.js";
import DB from "../../commonQuery/commonQuery.js";
import mongoose from "mongoose";

const USERS_KEY = "user";
const ROLES_KEY = "role";
const KYC_KEY = "clientKYC";

/**
 * POST /api/login
 * Central login: phone OR email + password
 */
export const login = async (req, res) => {
  try {
    const { phone, email, password } = req.body || {};
    if ((!phone && !email) || !password) {
      return res.status(400).json({
        status: false,
        message: "Phone/email and password are required",
      });
    }

    const q = phone ? { phone } : { email: (email || "").toLowerCase() };

    const user = await DB.AsyncfindOne(USERS_KEY, q, {});
    if (!user) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res
        .status(401)
        .json({ status: false, message: "Invalid credentials" });

    // fetch role name for payload
    let roleName = null;
    if (user.role) {
      const roleDoc = await DB.AsyncfindOne(
        ROLES_KEY,
        { _id: user.role },
        { name: 1 }
      );
      roleName = roleDoc?.name || null;
    }

    // sign using your helper; jwtVerify expects `${config.jwtName}-${token}`
    const token = jwtSign({ userId: String(user._id), roleName });

    return res.status(200).json({
      status: true,
      message: "Login successful",
      token, // client keeps this; server will verify+attach user later
      user: {
        id: String(user._id),
        name: user.name,
        phone: user.phone,
        email: user.email,
        roleName,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

/**
 * POST /api/client/register
 * Creates a new user with role = Client
 */
export const registerClient = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body || {};
    if (!name || !phone || !password) {
      return res.status(400).json({
        status: false,
        message: "Name, phone, and password are required",
      });
    }

    // uniqueness check
    const exists = await DB.AsyncfindOne(
      USERS_KEY,
      { $or: [{ phone }, { email: (email || "").toLowerCase() }] },
      {}
    );
    if (exists) {
      return res
        .status(400)
        .json({ status: false, message: "User already exists (phone/email)" });
    }

    const clientRole = await DB.AsyncfindOne(ROLES_KEY, { name: "Client" }, {});
    if (!clientRole) {
      return res.status(500).json({
        status: false,
        message: "Client role missing. Seed roles first.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await DB.AsyncInsert(USERS_KEY, {
      name,
      phone,
      email: email ? email.toLowerCase() : undefined,
      passwordHash,
      role: clientRole._id,
      emailStatus: email ? "unverified" : "verified",
      active: true,
    });

    const token = jwtSign({ userId: String(created._id), roleName: "Client" });

    return res.status(201).json({
      status: true,
      message: "Client registered",
      token,
      user: {
        id: String(created._id),
        name: created.name,
        phone: created.phone,
        email: created.email,
        roleName: "Client",
      },
    });
  } catch (err) {
    console.error("registerClient error:", err);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};

/**
 * POST /api/client/kyc
 * Requires jwtVerify + attachUser; we do NOT trust frontend for user id/role.
 */
export const submitKYC = async (req, res) => {
  try {
    const u = req.user; // set by attachUser
    if (!u?.id)
      return res.status(401).json({ status: false, message: "Unauthorized" });
    if (u.roleName !== "Client") {
      return res
        .status(403)
        .json({ status: false, message: "Only Clients can submit KYC" });
    }

    const {
      fullName,
      phone,
      idDocType,
      idDocNumber,
      photoUrl,
      idDocUrl,
      references,
    } = req.body || {};

    if (
      !fullName ||
      !phone ||
      !idDocType ||
      !idDocNumber ||
      !Array.isArray(references) ||
      references.length < 3
    ) {
      return res.status(400).json({
        status: false,
        message: "Missing or invalid KYC fields (need 3 references)",
      });
    }

    const upsert = await DB.AsyncfindOneAndUpdate(
      KYC_KEY,
      { user: new mongoose.Types.ObjectId(u.id) },
      {
        user: new mongoose.Types.ObjectId(u.id),
        fullName,
        phone,
        idDocType,
        idDocNumber,
        photoUrl,
        idDocUrl,
        references,
        status: "PENDING",
        reviewedBy: null,
        reviewedAt: null,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json({
      status: true,
      message: "KYC submitted (PENDING review)",
      data: upsert,
    });
  } catch (err) {
    console.error("submitKYC error:", err);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};
