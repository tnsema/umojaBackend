// services/invoice.service.js

import mongoose from "mongoose";
import puppeteer from "puppeteer";
import Models from "../model/model.js";
import { renderInvoiceHtml } from "../templates/invoiceTemplate.js";

const { invoice: Invoice, user: User } = Models;
const { isValidObjectId } = mongoose;

/**
 * Generate a simple invoice number
 * Example: INV-20251201-12345
 */
export function generateInvoiceNumber(prefix = "INV") {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${y}${m}${d}-${rand}`;
}

/**
 * Create a generic invoice.
 *
 * payload:
 * {
 *   userId,
 *   type,
 *   reference?,
 *   principalAmount,
 *   interestAmount,
 *   totalAmount?,        // if not provided, principal+interest
 *   dueDate,
 *   currency?,
 *   note?,
 *   metadata?
 * }
 */
export async function createInvoice(payload) {
  const {
    userId,
    type,
    reference,
    principalAmount = 0,
    interestAmount = 0,
    totalAmount,
    dueDate,
    currency = "ZAR",
    note,
    metadata,
  } = payload;

  if (!isValidObjectId(userId)) {
    const err = new Error("Invalid user ID");
    err.statusCode = 400;
    throw err;
  }
  if (!dueDate) {
    const err = new Error("Due date is required for invoice");
    err.statusCode = 400;
    throw err;
  }

  const invoiceNumber = generateInvoiceNumber();

  const principal = Number(principalAmount || 0);
  const interest = Number(interestAmount || 0);
  const total =
    typeof totalAmount === "number"
      ? Number(totalAmount)
      : principal + interest;

  const invoice = await Invoice.create({
    userId,
    invoiceNumber,
    type,
    reference,
    issueDate: new Date(),
    dueDate,
    principalAmount: principal,
    interestAmount: interest,
    totalAmount: total,
    currency,
    note,
    metadata,
  });

  return invoice;
}

/**
 * Get single invoice
 */
export async function getInvoiceById(invoiceId) {
  if (!isValidObjectId(invoiceId)) {
    const err = new Error("Invalid invoice ID");
    err.statusCode = 400;
    throw err;
  }

  const invoice = await Invoice.findById(invoiceId).populate(
    "userId",
    "firstName lastName phone"
  );

  if (!invoice) {
    const err = new Error("Invoice not found");
    err.statusCode = 404;
    throw err;
  }

  return invoice;
}

/**
 * List invoices for a user
 */
export async function getInvoicesForUser(
  userId,
  { page = 1, limit = 20 } = {}
) {
  if (!isValidObjectId(userId)) {
    const err = new Error("Invalid user ID");
    err.statusCode = 400;
    throw err;
  }

  page = Number(page) || 1;
  limit = Number(limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { userId };

  const [items, total] = await Promise.all([
    Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
    Invoice.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Generate a PDF (Buffer) for the invoice using Puppeteer + HTML template
 */
export async function generateInvoicePdf(invoiceId) {
  const invoice = await getInvoiceById(invoiceId);
  const raw = invoice.toObject();

  const populatedUser = invoice.userId || null;

  const html = renderInvoiceHtml({
    ...raw,
    user: populatedUser,
  });

  const browser = await puppeteer.launch({
    headless: "new",
    // args: ["--no-sandbox", "--disable-setuid-sandbox"], // if needed
  });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
  });

  await browser.close();
  return { pdfBuffer, invoice };
}
