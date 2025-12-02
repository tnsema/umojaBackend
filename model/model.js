// model.js
// Central place to import and export all Mongoose models used in Umoja.

import user from "../schema/User.js";
import role from "../schema/Role.js";
import memberProfile from "../schema/MemberProfile.js";
import kyc from "../schema/Kyc.js";
import wallet from "../schema/Wallet.js";
import walletTransaction from "../schema/WalletTransaction.js";
import loan from "../schema/Loan.js";
import loanGuarantorDecision from "../schema/LoanGuarantorDecision.js";
import contribution from "../schema/Contribution.js";
import capitalPayment from "../schema/CapitalPayment.js";
import project from "../schema/Project.js";
import projectContribution from "../schema/ProjectContribution.js";
import transfer from "../schema/Transfer.js";
import payout from "../schema/Payout.js";
import meeting from "../schema/Meeting.js";
import meetingAttendance from "../schema/MeetingAttendance.js";
import ruleDocument from "../schema/RuleDocument.js";
import systemSetting from "../schema/SystemSetting.js";
import auditLog from "../schema/AuditLog.js";
import mainAccount from "../schema/MainAccout.js";
import notification from "../schema/Notification.js";
import address from "../schema/Address.js";
import deposit from "../schema/Deposit.js";
import userContact from "../schema/UserContact.js";
import loanCollateral from "../schema/LoanCollateral.js";
import repaymentPlan from "../schema/RepaymentPlan.js";
import loanReference from "../schema/LoanReference.js";
import invoice from "../schema/Invoice.js";
import loanRepayment from "../schema/LoanRepayment.js";

const Models = {
  user, // base user accounts (multi-role via Role collection)
  role, // role definitions (CLIENT, MEMBER, ADMIN, etc.)
  memberProfile, // extra data for members (membershipNumber, capital years)
  kyc, // KYC submissions + documents + review status
  wallet, // on-platform wallet (balance per user)
  walletTransaction, // immutable movement log for wallets

  loan, // loans (request → approval → disbursement → repayment)
  loanGuarantorDecision, // guarantor approval / rejection for loans

  contribution, // monthly contributions (used later for year-end sharing/dividends)
  capitalPayment, // annual capital payments (separate from monthly contributions)

  project, // projects (requested, managed, approved)
  projectContribution, // contributions into projects + commission

  transfer, // remittance transfer from member to external recipient
  payout, // payout event by paying agent

  meeting, // governance meetings
  meetingAttendance, // who attended which meeting

  ruleDocument, // uploaded rules / policies
  systemSetting, // configurable key-value settings
  auditLog, // audit trail for important actions
  mainAccount, // main bank account details
  notification, // user notifications
  address, // addresses linked to users
  deposit, // bank deposits linked to wallets
  userContact, // user contact list entries
  loanCollateral,
  repaymentPlan,
  loanReference,
  invoice,
  loanRepayment,
};

export default Models;
