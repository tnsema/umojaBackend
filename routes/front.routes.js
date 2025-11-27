// routes/front.routes.js
import express from "express";
import { upload } from "../config/multer.js";
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
import * as depositCtrl from "../controllers/deposit.controller.js";
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
// Transfer controller imports
import {
  createTransfer,
  verifyTransferByReference,
  updateTransferStatusByReference,
  deleteTransferById,
  listAllTransfers,
  listTransfersForAuthenticatedUser,
  listTransfersForUser,
  listTransfersByStatus,
  listTransfersForAuthenticatedUserByStatus,
  calculateInterest,
  getTransferById,
} from "../controllers/transfer.controller.js";
import {
  createWalletTransaction,
  listWalletTransactions,
  getWalletTransaction,
} from "../controllers/walletTransaction.controller.js";
import * as addressCtrl from "../controllers/address.controller.js";
import {
  addContactById,
  addContactByPhone,
  listMyContacts,
  removeContact,
} from "../controllers/contact.controller.js";

const router = express.Router();

//const upload = multer({ dest: "uploads/" });

// Health check
router.get("/health", (_req, res) => res.json({ ok: true }));

// =========================
// Users
// =========================

// Auth
router.post("/login", upload.none(), userCtrl.login);

// Get user by phone (for external services)
router.post("/users/phone", upload.none(), jwtVerify, userCtrl.getUserByPhone);

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

// =========================
// Members
// =========================

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

// =========================
// Wallets
// =========================

// Admin: create wallet
router.post(
  "/wallets",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN", "MEMBER", "CLIENT"),
  walletCtrl.createWalletForUser
);

// Logged-in user: see own wallet
router.get("/wallets/me", jwtVerify, walletCtrl.getMyWallet);

// Admin: deposit
router.post(
  "/wallets/:walletId/deposit",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN", "MEMBER", "CLIENT"),
  walletCtrl.depositToWallet
);

// Admin: withdraw
router.post(
  "/wallets/:walletId/withdraw",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN", "MEMBER", "CLIENT"),
  walletCtrl.withdrawFromWallet
);

// =========================
// Notifications
// =========================

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

// =========================
// Roles
// =========================

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

// =========================
// Contributions
// =========================

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

// =========================
// KYC
// =========================

// User submits KYC
router.post(
  "/kyc/submit",
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
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

router.get("/kyc/all", jwtVerify, requireRole("ADMIN"), kycCtrl.listAllKYC);

// =========================
// Loans
// =========================

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

// Borrower/Admin: cancel
router.post(
  "/loans/:loanId/cancel",
  upload.none(),
  jwtVerify,
  loanCtrl.cancelLoan
);

// 🔥 NEW: Borrower → get all my loans
router.get(
  "/loans/me",
  jwtVerify,
  requireRole("MEMBER", "CLIENT"),
  loanCtrl.getMyLoans
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

// =========================
// Meetings
// =========================

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

// =========================
// Projects
// =========================

// Create a new project
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

// =========================
// Transfers
// =========================

// Create a transfer (logged-in user → sender)
router.post(
  "/transfers",
  upload.none(),
  jwtVerify,
  requireRole("MEMBER", "CLIENT"),
  createTransfer
);

// Verify transfer by reference
router.get(
  "/transfers/verify/:reference",
  jwtVerify,
  requireRole("ADMIN", "MEMBER", "CLIENT"),
  verifyTransferByReference
);

// Update transfer status (ADMIN only)
router.patch(
  "/transfers/:reference/status",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  updateTransferStatusByReference
);

// Delete transfer (ADMIN only)
router.delete(
  "/transfers/:transferId",
  jwtVerify,
  requireRole("ADMIN"),
  deleteTransferById
);

// List ALL transfers (ADMIN)
router.get("/transfers", jwtVerify, requireRole("ADMIN"), listAllTransfers);

// List all transfers for authenticated user
router.get(
  "/transfers/me",
  jwtVerify,
  requireRole("MEMBER", "CLIENT"),
  listTransfersForAuthenticatedUser
);

// List transfers for a specific user (ADMIN)
router.get(
  "/transfers/user/:userId",
  jwtVerify,
  requireRole("ADMIN"),
  listTransfersForUser
);

// List transfers by status (ADMIN)
router.get(
  "/transfers/status/:status",
  jwtVerify,
  requireRole("ADMIN"),
  listTransfersByStatus
);

// List authenticated user's transfers filtered by status
router.get(
  "/transfers/me/status/:status",
  jwtVerify,
  requireRole("MEMBER", "CLIENT"),
  listTransfersForAuthenticatedUserByStatus
);

router.post(
  "/transfers/calculate-interest",
  upload.none(),
  jwtVerify,
  requireRole("MEMBER", "CLIENT", "ADMIN"),
  calculateInterest
);

router.get(
  "/transfers/:transferId",
  jwtVerify,
  requireRole("ADMIN", "MEMBER", "CLIENT"),
  getTransferById
);
// -------------------- Deposits --------------------

// Create a deposit (CLIENT / MEMBER uploads PoP)
router.post(
  "/deposits",
  upload.single("pop"), // or upload.none() if popUrl only from body
  jwtVerify,
  requireRole("CLIENT", "MEMBER", "ADMIN"),
  depositCtrl.createDeposit
);

// Admin verifies deposit
router.post(
  "/deposits/:depositId/verify",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  depositCtrl.verifyDeposit
);

// Admin updates status generically
router.patch(
  "/deposits/:depositId/status",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  depositCtrl.updateDepositStatus
);

// Admin deletes deposit
router.delete(
  "/deposits/:depositId",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN"),
  depositCtrl.deleteDeposit
);

// Wallet Transactions
router.post(
  "/wallet-transactions",
  upload.none(),
  jwtVerify,
  requireRole("ADMIN", "MEMBER", "CLIENT"),
  createWalletTransaction
);

router.get(
  "/wallet-transactions/:walletId",
  jwtVerify,
  requireRole("ADMIN", "MEMBER", "CLIENT"),
  listWalletTransactions
);

router.get(
  "/wallet-transaction/:id",
  jwtVerify,
  requireRole("ADMIN", "MEMBER", "CLIENT"),
  getWalletTransaction
);

// =====================
// Addresses
// =====================

// Create address for logged-in user
router.post(
  "/addresses",
  upload.none(),
  jwtVerify,
  addressCtrl.createMyAddress
);

// List addresses for logged-in user
router.get("/addresses", jwtVerify, addressCtrl.listMyAddresses);

// Get a single address (must belong to logged-in user)
router.get("/addresses/:id", jwtVerify, addressCtrl.getMyAddress);

// Update address
router.patch(
  "/addresses/:id",
  upload.none(),
  jwtVerify,
  addressCtrl.updateMyAddress
);

// Delete address
router.delete("/addresses/:id", jwtVerify, addressCtrl.deleteMyAddress);

// =====================
// Contacts
// =====================
// List my contacts
router.get("/users/me/contacts", jwtVerify, listMyContacts);

// Add contact by userId
router.post(
  "/users/me/contacts/by-id",
  upload.none(),
  jwtVerify,
  addContactById
);

// Add contact by phone
router.post(
  "/users/me/contacts/by-phone",
  upload.none(),
  jwtVerify,
  addContactByPhone
);

// Remove a contact (contactId is the contact user's _id)
router.delete("/users/me/contacts/:contactId", jwtVerify, removeContact);

export default router;
