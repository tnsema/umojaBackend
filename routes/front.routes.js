// routes/front.routes.js
import express from "express";
import multer from "multer";
import { jwtVerify, jwtSign, requireRole } from "../helper/jwtVerify.js";
import * as userCtrl from "../controllers/user.controller.js";
import {
  upgradeClientToMember,
  assignMemberAdminRole,
  assignMemberAsProjectManager,
} from "../controllers/member.controller.js";
import * as walletCtrl from "../controllers/wallet.controller.js";
import * as notifCtrl from "../controllers/notification.controller.js";
import * as roleCtrl from "../controllers/role.controller.js";
import * as contribCtrl from "../controllers/contribution.controller.js";
import * as kycCtrl from "../controllers/kyc.controller.js";
import * as loanCtrl from "../controllers/loan.controller.js";
import * as meetingCtrl from "../controllers/meeting.controller.js";
import * as meetingAttCtrl from "../controllers/meetingAttendance.controller.js";
import * as payoutCtrl from "../controllers/payout.controller.js";
import {
  createProject,
  assignProjectManager,
  addProjectMember,
  updateProjectStatus,
  updateBalance,
} from "../controllers/project.controller.js";
import {
  createProjectContribution,
  listProjectContributions,
} from "../controllers/projectContribution.controller.js";
import {
  createTransferRequest,
  verifyTransfer,
  listMyTransfers,
  listUserTransfers,
  getTransferByRef,
} from "../controllers/transfer.controller.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

// Health check
router.get("/health", (_req, res) => res.json({ ok: true }));

// Auth
router.post("/login", upload.none(), userCtrl.login);

// Registration
router.post("/client/register", upload.none(), userCtrl.registerClient);

// Shadow client (internal use)
router.post(
  "/users/shadow",
  upload.none(),
  jwtVerify,
  userCtrl.createShadowClient
);

// Profile
router.patch(
  "/users/me/profile",
  upload.none(),
  jwtVerify,
  userCtrl.updateMyProfile
);

// Delete user
router.delete(
  "/users/:userId",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  userCtrl.deleteUser
);

// Upgrade request
router.post(
  "/users/upgrade-request",
  upload.none(),
  jwtVerify,
  userCtrl.requestUserUpgrade
);

// Member operations
// Upgrade client → member
router.post(
  "/members/:userId/upgrade",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  upgradeClientToMember
);

// Make member an admin
router.post(
  "/members/:userId/make-admin",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  assignMemberAdminRole
);

// Make member a project manager
router.post(
  "/members/:memberId/make-project-manager",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  assignMemberAsProjectManager
);

// Admin: create wallet
router.post(
  "/wallets",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  walletCtrl.createWalletForUser
);

// Logged-in user: see own wallet
router.get("/wallets/me", jwtVerify, walletCtrl.getMyWallet);

// Admin: deposit
router.post(
  "/wallets/:walletId/deposit",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  walletCtrl.depositToWallet
);

// Admin: withdraw
router.post(
  "/wallets/:walletId/withdraw",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  walletCtrl.withdrawFromWallet
);

// Admin: transfer between wallets
router.post(
  "/wallets/transfer",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  walletCtrl.transferBetweenWallets
);

// Create notification (admin/system)
router.post(
  "/notifications",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN", "MEMBER", "CLIENT"),
  notifCtrl.createNotification
);

// Admin: all notifications
router.get(
  "/notifications/all",
  jwtVerify,
  requireRole("ADMIN"),
  notifCtrl.listAllNotifications
);

// Get single notification
router.get("/notifications/:id", jwtVerify, notifCtrl.getNotification);

// Logged-in user: my notifications
router.get("/notifications", jwtVerify, notifCtrl.listMyNotifications);

// Mark as read
router.post(
  "/notifications/:id/read",
  upload.none(),
  jwtVerify,
  notifCtrl.markNotificationRead
);

// Delete
router.delete(
  "/notifications/:id",
  upload.none(),
  jwtVerify,
  notifCtrl.deleteNotification
);

// Create role
router.post(
  "/roles",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  roleCtrl.createRole
);

// List roles
router.get("/roles", jwtVerify, requireRole("ADMIN"), roleCtrl.listRoles);

// Assign role to user
router.post(
  "/roles/assign",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  roleCtrl.assignRoleToUser
);

// Remove role from user
router.post(
  "/roles/remove",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  roleCtrl.removeRoleFromUser
);

// Member: create own contribution
router.post(
  "/contributions",
  upload.none(),
  jwtVerify,
  contribCtrl.createContribution
);

// Member: see own contributions
router.get("/contributions/me", jwtVerify, contribCtrl.listMyContributions);

// Admin: see contributions by member
router.get(
  "/contributions/member/:memberId",
  jwtVerify,
  requireRole("ADMIN"),
  contribCtrl.listMemberContributions
);

// Admin: mark contribution PAID
router.post(
  "/contributions/:id/mark-paid",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  contribCtrl.markContributionPaid
);

// Admin: by year
router.get(
  "/contributions/year/:year",
  jwtVerify,
  requireRole("ADMIN"),
  contribCtrl.getContributionsByYear
);

// Admin: by month
router.get(
  "/contributions/month/:month",
  jwtVerify,
  requireRole("ADMIN"),
  contribCtrl.getContributionsByMonth
);

// Admin: by year & member
router.get(
  "/contributions/member/:memberId/year/:year",
  jwtVerify,
  requireRole("ADMIN"),
  contribCtrl.getContributionsByYearByMember
);

// User submits KYC
router.post(
  "/kyc/submit",
  upload.none(), // or upload.fields([...]) if you use file uploads
  jwtVerify,
  kycCtrl.submitKYC
);

// Admin approves KYC
router.post(
  "/kyc/:kycId/approve",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  kycCtrl.approveKYC
);

// Admin rejects KYC
router.post(
  "/kyc/:kycId/reject",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  kycCtrl.rejectKYC
);

// Logged-in user: see own KYC
router.get("/kyc/me", jwtVerify, kycCtrl.getMyKYC);

// Admin: get KYC by user
router.get(
  "/kyc/user/:userId",
  jwtVerify,
  requireRole("ADMIN"),
  kycCtrl.getKYCByUser
);

// Borrower: request loan
router.post(
  "/loans/request",
  upload.none(),
  jwtVerify,
  requireRole("MEMBER", "CLIENT"),
  loanCtrl.requestLoan
);

// Guarantor: decision
router.post(
  "/loans/:loanId/guarantor-decision",
  upload.none(),
  jwtVerify,
  requireRole("MEMBER", "CLIENT"),
  loanCtrl.guarantorDecision
);

// Admin: review
router.post(
  "/loans/:loanId/admin-review",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  loanCtrl.adminReviewLoan
);

// Borrower: confirm acceptance
router.post(
  "/loans/:loanId/confirm-acceptance",
  upload.none(),
  jwtVerify,
  requireRole("MEMBER", "CLIENT"),
  loanCtrl.borrowerConfirmAcceptance
);

// Admin: disburse
router.post(
  "/loans/:loanId/disburse",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  loanCtrl.disburseLoan
);

// Borrower: repay
router.post(
  "/loans/:loanId/repay",
  upload.none(),
  jwtVerify,
  requireRole("MEMBER", "CLIENT"),
  loanCtrl.repayLoan
);

// Borrower/Admin: cancel (you can tighten roles if you want)
router.post(
  "/loans/:loanId/cancel",
  upload.none(),
  jwtVerify,
  loanCtrl.cancelLoan
);

// Guarantor: my agreed loans
router.get(
  "/loans/guarantor/me",
  jwtVerify,
  requireRole("MEMBER", "CLIENT"),
  loanCtrl.getLoansAgreedByMe
);

// Admin: loans agreed by any member
router.get(
  "/loans/guarantor/:memberId",
  jwtVerify,
  requireRole("ADMIN"),
  loanCtrl.getLoansAgreedByMember
);

// Admin: all loans
router.get("/loans", jwtVerify, requireRole("ADMIN"), loanCtrl.listAllLoans);

// Create meeting
router.post(
  "/meetings",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN", "PROJECT_MANAGER"),
  meetingCtrl.createMeeting
);

// Update meeting
router.post(
  "/meetings/:meetingId",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN", "PROJECT_MANAGER"),
  meetingCtrl.updateMeeting
);

// Delete meeting
router.delete(
  "/meetings/:meetingId",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN", "PROJECT_MANAGER"),
  meetingCtrl.deleteMeeting
);

// Set decision summary
router.post(
  "/meetings/:meetingId/decision-summary",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN", "PROJECT_MANAGER"),
  meetingCtrl.setMeetingDecisionSummary
);

// Record attendance
router.post(
  "/meetings/:meetingId/attendance",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN", "PROJECT_MANAGER"),
  meetingAttCtrl.recordAttendance
);

// List meeting attendance
router.get(
  "/meetings/:meetingId/attendance",
  jwtVerify,
  requireRole("ADMIN", "PROJECT_MANAGER"),
  meetingAttCtrl.listMeetingAttendance
);

// Agent/Admin: create payout for a transfer
router.post(
  "/payouts",
  upload.none(),
  jwtVerify,
  requireRole("PAYING_AGENT", "ADMIN"),
  payoutCtrl.createPayout
);

// Agent/Admin: update payout status
router.post(
  "/payouts/:payoutId/status",
  upload.none(),
  jwtVerify,
  requireRole("PAYING_AGENT", "ADMIN"),
  payoutCtrl.updatePayoutStatus
);

// Anyone with ref (or protected by jwtVerify if you prefer)
router.post(
  "/payouts/verify",
  upload.none(),
  /* jwtVerify,  // optional */
  payoutCtrl.verifyPayout
);

// Create a new project
// - typically any MEMBER/CLIENT can request a project
router.post(
  "/projects",
  upload.none(),
  jwtVerify,
  requireRole("MEMBER", "CLIENT", "ADMIN"),
  createProject
);

// Assign a project manager
// - only ADMIN (or later you can add PROJECT_MANAGER if needed)
router.post(
  "/projects/:projectId/assign-manager",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  assignProjectManager
);

// Add a member to a project
// - ADMIN or PROJECT_MANAGER of that project
router.post(
  "/projects/:projectId/add-member",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN", "PROJECT_MANAGER"),
  addProjectMember
);

// Update project status (PENDING_APPROVAL, ACTIVE, ARCHIVED, TERMINATED)
// - ADMIN only
router.post(
  "/projects/:projectId/status",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  updateProjectStatus
);

// Update project balance (INCREASE / DECREASE)
// - ADMIN only (or later add a FINANCE role)
router.post(
  "/projects/:projectId/balance",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  updateBalance
);

router.post(
  "/project-contributions",
  upload.none(),
  jwtVerify,
  requireRole("MEMBER", "ADMIN"),
  createProjectContribution
);

// List project contributions
router.get(
  "/projects/:projectId/contributions",
  jwtVerify,
  requireRole("ADMIN", "PROJECT_MANAGER", "MEMBER"),
  listProjectContributions
);

// Sender creates transfer request
router.post(
  "/transfers",
  upload.none(),
  jwtVerify,
  requireRole("CLIENT", "MEMBER"),
  createTransferRequest
);

// Admin verifies transfer
router.post(
  "/transfers/:transferId/verify",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  verifyTransfer
);

// Logged-in user: list their transfers
router.get("/transfers/me", jwtVerify, listMyTransfers);

// Admin: list transfers of specific user
router.get(
  "/transfers/user/:userId",
  jwtVerify,
  requireRole("ADMIN"),
  listUserTransfers
);

// Get transfer by systemRef
router.get(
  "/transfers/ref/:systemRef",
  jwtVerify, // or optional
  getTransferByRef
);

export default router;
