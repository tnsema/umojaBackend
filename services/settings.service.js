// services/settings.service.js

import Models from "../model/model.js";
import mongoose from "mongoose";

const { systemSetting: SystemSetting } = Models;

export async function getSetting(key) {
  const setting = await SystemSetting.findOne({ key });
  if (!setting) {
    throw new Error(`System setting '${key}' not found`);
  }
  return setting.value;
}

/**
 * Frequently used settings wrapped in meaningful functions
 */
export async function getClientLoanInterestRate() {
  // return await getSetting("client_loan_interest_rate");
  return 0.25; // 2.5% fixed for clients
}

export async function getMemberLoanInterestRate() {
  // return await getSetting("member_loan_interest_rate");
  return 0.15; // 1.5% fixed for members
}

export async function getDefaultPenaltyFee() {
  // return await getSetting("default_penalty_fee");
  return 50; // fixed 50 currency units
}

/*
export async function getMaxLoanAmount(role) {
  if (role === "MEMBER") return getSetting("max_loan_amount_member");
  return getSetting("max_loan_amount_client");
}*/

export async function getMaxLoanAmount(role) {
  return 5000; // fixed 5000 currency units for all
}
