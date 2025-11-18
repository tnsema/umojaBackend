// services/projectContribution.service.js
// Business logic for member contributions into projects.

import Models from "../model/model.js";
import mongoose from "mongoose";
import { updateBalanceService } from "./project.service.js";

const {
  project: Project,
  user: User,
  projectContribution: ProjectContribution,
  walletTransaction: WalletTransaction,
} = Models;

const { isValidObjectId } = mongoose;

/**
 * createProjectContribution({
 *   projectId,
 *   memberId,
 *   amount,
 *   method?,        // "WALLET" | "POP" (default "WALLET")
 *   walletTxId,     // required by schema
 * })
 *
 * Steps:
 *  - validate project, member, and walletTx
 *  - compute commissionAmount from project.commissionRate
 *  - create ProjectContribution record
 *  - update project.balance by net (amount - commissionAmount)
 */
export async function createProjectContributionService({
  projectId,
  memberId,
  amount,
  method = "WALLET",
  walletTxId,
}) {
  if (!projectId || !memberId || !amount || !walletTxId) {
    const err = new Error(
      "projectId, memberId, amount and walletTxId are required"
    );
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (
    !isValidObjectId(projectId) ||
    !isValidObjectId(memberId) ||
    !isValidObjectId(walletTxId)
  ) {
    const err = new Error("Invalid projectId, memberId or walletTxId");
    err.code = "INVALID_ID";
    throw err;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error("Project not found");
    err.code = "PROJECT_NOT_FOUND";
    throw err;
  }

  const member = await User.findById(memberId);
  if (!member) {
    const err = new Error("Member not found");
    err.code = "MEMBER_NOT_FOUND";
    throw err;
  }

  const walletTx = await WalletTransaction.findById(walletTxId);
  if (!walletTx) {
    const err = new Error("Wallet transaction not found");
    err.code = "WALLET_TX_NOT_FOUND";
    throw err;
  }

  const value = Number(amount);
  if (isNaN(value) || value <= 0) {
    const err = new Error("Invalid contribution amount");
    err.code = "INVALID_AMOUNT";
    throw err;
  }

  const methodUpper = String(method).trim().toUpperCase();
  if (!["WALLET", "POP"].includes(methodUpper)) {
    const err = new Error("Invalid contribution method");
    err.code = "INVALID_METHOD";
    throw err;
  }

  const commissionRate = Number(project.commissionRate || 0);
  const commissionAmount = Math.round(value * commissionRate);
  const netToProject = value - commissionAmount;

  const contribution = await ProjectContribution.create({
    projectId,
    memberId,
    method: methodUpper,
    amount: value,
    walletTxId,
    commissionAmount,
  });

  // Update project balance by net amount
  if (netToProject !== 0) {
    await updateBalanceService({
      projectId,
      amount: netToProject,
      operation: "INCREASE",
    });
  }

  return { contribution, netToProject, commissionAmount };
}

/**
 * listProjectContributions(projectId)
 *
 * Returns all contributions for a project, newest first.
 */
export async function listProjectContributionsService(projectId) {
  if (!projectId) {
    const err = new Error("projectId is required");
    err.code = "FIELDS_REQUIRED";
    throw err;
  }

  if (!isValidObjectId(projectId)) {
    const err = new Error("Invalid projectId");
    err.code = "INVALID_PROJECT_ID";
    throw err;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error("Project not found");
    err.code = "PROJECT_NOT_FOUND";
    throw err;
  }

  const contributions = await ProjectContribution.find({ projectId })
    .populate("memberId", "firstName lastName phone email")
    .populate("walletTxId")
    .sort({ createdAt: -1 })
    .lean();

  return contributions;
}
