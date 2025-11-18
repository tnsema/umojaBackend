// services/role.service.js
// Business logic for creating roles and assigning them to users.

import Models from "../model/model.js";

const { role: Role, user: User } = Models;

/**
 * createRole({ name, label, description })
 *
 * - name: internal, uppercase unique (e.g. "CLIENT", "MEMBER", "ADMIN")
 * - label: human readable (e.g. "Client", "Member", "Administrator")
 * - description: optional
 */
export async function createRoleService({ name, label, description }) {
  if (!name || !label) {
    const err = new Error("Name and label are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  const normalizedName = String(name).trim().toUpperCase();

  const existing = await Role.findOne({ name: normalizedName });
  if (existing) {
    const err = new Error("Role name already exists");
    err.code = "ROLE_EXISTS";
    throw err;
  }

  const role = await Role.create({
    name: normalizedName,
    label: label.trim(),
    description: description || "",
  });

  return role;
}

/**
 * listRoles()
 */
export async function listRolesService() {
  return Role.find().sort({ name: 1 }).lean();
}

/**
 * assignRoleToUser({ userId, roleName })
 *
 * - roleName: string, case-insensitive (e.g. "admin", "ADMIN", "Admin")
 * - adds role ObjectId to user.roles[] if not present
 */
export async function assignRoleToUserService({ userId, roleName }) {
  if (!userId || !roleName) {
    const err = new Error("userId and roleName are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  const user = await User.findById(userId).populate("roles");
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const normalizedName = String(roleName).trim().toUpperCase();
  const role = await Role.findOne({ name: normalizedName });
  if (!role) {
    const err = new Error("Role not found");
    err.code = "ROLE_NOT_FOUND";
    throw err;
  }

  const roleIdStr = String(role._id);
  const existingRoleIds = (user.roles || []).map((r) => String(r._id || r));

  if (!existingRoleIds.includes(roleIdStr)) {
    user.roles.push(role._id);
    await user.save();
  }

  return user;
}

/**
 * removeRoleFromUser({ userId, roleName })
 *
 * - removes role ObjectId from user.roles[]
 */
export async function removeRoleFromUserService({ userId, roleName }) {
  if (!userId || !roleName) {
    const err = new Error("userId and roleName are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  const user = await User.findById(userId).populate("roles");
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const normalizedName = String(roleName).trim().toUpperCase();
  const role = await Role.findOne({ name: normalizedName });
  if (!role) {
    const err = new Error("Role not found");
    err.code = "ROLE_NOT_FOUND";
    throw err;
  }

  const roleIdStr = String(role._id);
  const currentIds = (user.roles || []).map((r) => String(r._id || r));

  if (!currentIds.includes(roleIdStr)) {
    // nothing to remove
    return user;
  }

  user.roles = user.roles.filter((r) => String(r._id || r) !== roleIdStr);
  await user.save();

  return user;
}
