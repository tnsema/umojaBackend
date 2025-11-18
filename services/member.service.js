// services/member.service.js
// Business logic for membership-related actions:
// - upgrade client → member
// - assign admin role
// - assign project manager role

import Models from "../model/model.js";

const { user: User, role: Role, memberProfile: MemberProfile } = Models;

// Simple membership number generator (you can customise this)
async function generateMembershipNumber() {
  const year = new Date().getFullYear();
  // Very low chance of collision; if you want, you can loop on duplicate key error
  return `M${year}-${Date.now().toString().slice(-5)}`;
}

/**
 * upgradeClientToMember(adminId, userId)
 *
 * - Ensures user exists
 * - Ensures user is not already a MEMBER
 * - Optionally requires they are at least a CLIENT
 * - Creates MemberProfile
 * - Adds MEMBER role to user.roles[]
 */
export async function upgradeClientToMemberService({ adminId, userId }) {
  // You can later use adminId to log audit, for now it's unused.
  const user = await User.findById(userId).populate("roles");
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const roleNames = (user.roles || []).map((r) => r.name);
  const isMemberAlready = roleNames.includes("MEMBER");

  if (isMemberAlready) {
    const err = new Error("User is already a member");
    err.code = "ALREADY_MEMBER";
    throw err;
  }

  // Optional rule: must at least be CLIENT before becoming MEMBER
  const isClient = roleNames.includes("CLIENT");
  if (!isClient) {
    const err = new Error("User must be a client before becoming a member");
    err.code = "NOT_CLIENT";
    throw err;
  }

  // Check if MemberProfile already exists (shouldn't if not MEMBER, but just in case)
  const existingProfile = await MemberProfile.findOne({ userId: user._id });
  if (existingProfile) {
    const err = new Error("Member profile already exists for this user");
    err.code = "PROFILE_EXISTS";
    throw err;
  }

  const memberRole = await Role.findOne({ name: "MEMBER" });
  if (!memberRole) {
    const err = new Error("MEMBER role not found. Please seed roles.");
    err.code = "ROLE_NOT_FOUND";
    throw err;
  }

  const membershipNumber = await generateMembershipNumber();

  const memberProfile = await MemberProfile.create({
    userId: user._id,
    membershipNumber,
    status: "ACTIVE",
    joinDate: new Date(),
    capitalPaidYears: [],
  });

  // Add MEMBER role if not already present
  const memberRoleIdStr = String(memberRole._id);
  const existingRoleIds = (user.roles || []).map((r) => String(r._id || r));
  if (!existingRoleIds.includes(memberRoleIdStr)) {
    user.roles.push(memberRole._id);
  }

  // Optionally bump user.status if you use something like PENDING_KYC / ACTIVE
  if (user.status === "PENDING_KYC") {
    user.status = "ACTIVE";
  }

  await user.save();

  return {
    user,
    memberProfile,
  };
}

/**
 * assignMemberAdminRole(adminId, userId)
 *
 * Adds ADMIN role to an existing member user.
 */
export async function assignMemberAdminRoleService({ adminId, userId }) {
  const user = await User.findById(userId).populate("roles");
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const roleNames = (user.roles || []).map((r) => r.name);
  const isMember = roleNames.includes("MEMBER");
  if (!isMember) {
    const err = new Error("User must be a member to become admin");
    err.code = "NOT_MEMBER";
    throw err;
  }

  const adminRole = await Role.findOne({ name: "ADMIN" });
  if (!adminRole) {
    const err = new Error("ADMIN role not found. Please seed roles.");
    err.code = "ROLE_NOT_FOUND";
    throw err;
  }

  const adminRoleIdStr = String(adminRole._id);
  const roleIds = (user.roles || []).map((r) => String(r._id || r));

  if (!roleIds.includes(adminRoleIdStr)) {
    user.roles.push(adminRole._id);
    await user.save();
  }

  return user;
}

/**
 * assignMemberAsProjectManager(adminId, memberId)
 *
 * Adds PROJECT_MANAGER role to a member.
 */
export async function assignMemberAsProjectManagerService({
  adminId,
  memberId,
}) {
  const user = await User.findById(memberId).populate("roles");
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const roleNames = (user.roles || []).map((r) => r.name);
  const isMember = roleNames.includes("MEMBER");
  if (!isMember) {
    const err = new Error("User must be a member to become a project manager");
    err.code = "NOT_MEMBER";
    throw err;
  }

  const pmRole = await Role.findOne({ name: "PROJECT_MANAGER" });
  if (!pmRole) {
    const err = new Error("PROJECT_MANAGER role not found. Please seed roles.");
    err.code = "ROLE_NOT_FOUND";
    throw err;
  }

  const pmRoleIdStr = String(pmRole._id);
  const roleIds = (user.roles || []).map((r) => String(r._id || r));

  if (!roleIds.includes(pmRoleIdStr)) {
    user.roles.push(pmRole._id);
    await user.save();
  }

  return user;
}
