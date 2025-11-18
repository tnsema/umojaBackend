// services/project.service.js
// Business logic for Umoja investment projects.

import Models from "../model/model.js";
import mongoose from "mongoose";

const { project: Project, user: User } = Models;
const { isValidObjectId } = mongoose;

const ALLOWED_STATUSES = [
  "PENDING_APPROVAL",
  "ACTIVE",
  "ARCHIVED",
  "TERMINATED",
];

/**
 * createProject({ name, description, requestedByMemberId })
 *
 * - Validates requester exists
 * - Creates project with status "PENDING_APPROVAL"
 * - Initially sets projectManagerId = requestedByMemberId (because schema requires it)
 */
export async function createProjectService({
  name,
  description,
  requestedByMemberId,
}) {
  if (!name || !requestedByMemberId) {
    const err = new Error("name and requestedByMemberId are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(requestedByMemberId)) {
    const err = new Error("Invalid requestedByMemberId");
    err.code = "INVALID_USER_ID";
    throw err;
  }

  const requester = await User.findById(requestedByMemberId);
  if (!requester) {
    const err = new Error("Requesting member not found");
    err.code = "REQUESTER_NOT_FOUND";
    throw err;
  }

  const project = await Project.create({
    name: String(name).trim(),
    description: description ? String(description).trim() : "",
    requestedByMemberId,
    projectManagerId: requestedByMemberId, // initial default manager
    commissionRate: 0.05,
    balance: 0,
    status: "PENDING_APPROVAL",
    approvedAt: null,
    approvedBy: null,
    // members: []  // if you add members array to schema, this will default to []
  });

  return project;
}

/**
 * assignProjectManager({ projectId, memberId })
 *
 * - Sets projectManagerId = memberId
 */
export async function assignProjectManagerService({ projectId, memberId }) {
  if (!projectId || !memberId) {
    const err = new Error("projectId and memberId are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(projectId) || !isValidObjectId(memberId)) {
    const err = new Error("Invalid projectId or memberId");
    err.code = "INVALID_ID";
    throw err;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error("Project not found");
    err.code = "PROJECT_NOT_FOUND";
    throw err;
  }

  const user = await User.findById(memberId);
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  project.projectManagerId = memberId;
  await project.save();

  return project;
}

/**
 * addProjectMember({ projectId, memberId })
 *
 * - Adds memberId to project.members via $addToSet
 *
 * NOTE: Your Project schema must have:
 * members: [{ type: Schema.Types.ObjectId, ref: "User" }]
 */
export async function addProjectMemberService({ projectId, memberId }) {
  if (!projectId || !memberId) {
    const err = new Error("projectId and memberId are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(projectId) || !isValidObjectId(memberId)) {
    const err = new Error("Invalid projectId or memberId");
    err.code = "INVALID_ID";
    throw err;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error("Project not found");
    err.code = "PROJECT_NOT_FOUND";
    throw err;
  }

  const user = await User.findById(memberId);
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  // If schema has no "members" yet, this will throw. Add it in the schema.
  const updated = await Project.findByIdAndUpdate(
    projectId,
    {
      $addToSet: { members: memberId },
    },
    { new: true }
  );

  return updated;
}

/**
 * updateProjectStatus({ projectId, status, adminId? })
 *
 * - Validates status in ALLOWED_STATUSES
 * - If status becomes ACTIVE, sets approvedAt + approvedBy (if provided)
 */
export async function updateProjectStatusService({
  projectId,
  status,
  adminId,
}) {
  if (!projectId || !status) {
    const err = new Error("projectId and status are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(projectId)) {
    const err = new Error("Invalid projectId");
    err.code = "INVALID_PROJECT_ID";
    throw err;
  }

  const statusUpper = String(status).trim().toUpperCase();
  if (!ALLOWED_STATUSES.includes(statusUpper)) {
    const err = new Error("Invalid project status");
    err.code = "INVALID_STATUS";
    throw err;
  }

  let project = await Project.findById(projectId);
  if (!project) {
    const err = new Error("Project not found");
    err.code = "PROJECT_NOT_FOUND";
    throw err;
  }

  project.status = statusUpper;

  if (statusUpper === "ACTIVE") {
    project.approvedAt = new Date();
    if (adminId && isValidObjectId(adminId)) {
      project.approvedBy = adminId;
    }
  }

  await project.save();

  return project;
}

/**
 * updateBalance({ projectId, amount, operation })
 *
 * operation:
 *  - "INCREASE" → balance += amount
 *  - "DECREASE" → balance -= amount
 *
 * (We export this as updateBalance to match your name.)
 */
export async function updateBalanceService({
  projectId,
  amount,
  operation = "INCREASE",
}) {
  if (!projectId || amount === undefined) {
    const err = new Error("projectId and amount are required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(projectId)) {
    const err = new Error("Invalid projectId");
    err.code = "INVALID_PROJECT_ID";
    throw err;
  }

  const value = Number(amount);
  if (isNaN(value)) {
    const err = new Error("Invalid amount");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  const op = String(operation).trim().toUpperCase();
  if (!["INCREASE", "DECREASE"].includes(op)) {
    const err = new Error("Invalid operation");
    err.code = "INVALID_OPERATION";
    throw err;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error("Project not found");
    err.code = "PROJECT_NOT_FOUND";
    throw err;
  }

  if (op === "INCREASE") {
    project.balance += value;
  } else {
    project.balance -= value;
  }

  await project.save();

  return project;
}
