// controllers/invoice.controller.js

import Models from "../model/model.js";
import PDFDocument from "pdfkit";
import { createInvoice } from "../services/invoice.service.js";

const { invoice: Invoice } = Models;

// Static payment details (can later move to config or DB)
const BANK_DETAILS = {
  accountName: "UMOJA ADMIN ACCOUNT (TBC)",
  bank: "Placeholder Bank Name",
  accountNumber: "000 000 0000",
  branchCode: "000000",
};

/**
 * POST /api/invoices
 * Generic invoice creation endpoint
 */
export async function createInvoiceController(req, res) {
  try {
    const userId = req.payload?.userId;

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const {
      type,
      reference,
      principalAmount,
      interestAmount,
      totalAmount,
      dueDate,
      currency,
      note,
      metadata,
    } = req.body ?? {};

    if (!type) {
      return res.status(400).json({
        status: false,
        message: "Field 'type' is required",
      });
    }

    const invoice = await createInvoice({
      userId,
      type,
      reference,
      principalAmount,
      interestAmount,
      totalAmount,
      dueDate,
      currency,
      note,
      metadata,
    });

    return res.status(201).json({
      status: true,
      message: "Invoice created successfully",
      data: { invoice },
    });
  } catch (err) {
    console.error("createInvoiceController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while creating the invoice.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /api/invoices/:id
 * Return invoice JSON
 */
export async function getInvoiceController(req, res) {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        status: false,
        message: "Invoice not found",
      });
    }

    return res.json({
      status: true,
      message: "Invoice fetched successfully",
      data: { invoice },
    });
  } catch (err) {
    console.error("getInvoiceController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while fetching the invoice.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /api/invoices/:id/pdf
 * Streams a generated PDF invoice to the client (no Puppeteer).
 */
export async function getInvoicePdfController(req, res) {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        status: false,
        message: "Invoice not found",
      });
    }

    const invoiceNumber = invoice.invoiceNumber || String(invoice._id);
    const type = invoice.type || "INVOICE";
    const reference = invoice.reference || "-";
    const dueDateStr = invoice.dueDate
      ? invoice.dueDate.toISOString().slice(0, 10)
      : "-";
    const currency = invoice.currency || "ZAR";

    const principal = Number(invoice.principalAmount || 0);
    const interest = Number(invoice.interestAmount || 0);
    const total = Number(invoice.totalAmount || 0);

    const installmentNumber = invoice.metadata?.installmentNumber ?? null;
    const totalInstallments = invoice.metadata?.totalInstallments ?? null;
    const installmentLabel =
      installmentNumber && totalInstallments
        ? `Installment ${installmentNumber} of ${totalInstallments}`
        : "";

    // ----- HTTP headers -----
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${invoiceNumber}.pdf"`
    );

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    const purple = "#721d70"; // Umoja purple-ish
    const greyText = "#555555";

    // ===== HEADER =====
    doc
      .font("Helvetica-Bold")
      .fontSize(26)
      .fillColor("#000000")
      .text("INVOICE", 50, 60);

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor(greyText)
      .text(invoiceNumber, 50, 90);

    // (Optional) logo circle on the right
    const headerRightX = 440;
    doc
      .circle(headerRightX + 40, 80, 36)
      .strokeColor("#000000")
      .lineWidth(2)
      .stroke();
    // You could draw a placeholder icon or text inside
    doc
      .fontSize(10)
      .fillColor(purple)
      .text("UMOJA", headerRightX + 12, 74);

    let y = 130;

    // ===== DETAILS BLOCK =====
    doc.fontSize(10).fillColor("#000000");
    doc
      .font("Helvetica-Bold")
      .text("Type: ", 50, y)
      .font("Helvetica")
      .text(type, 90, y);
    y += 14;

    doc
      .font("Helvetica-Bold")
      .text("Due Date: ", 50, y)
      .font("Helvetica")
      .text(dueDateStr, 110, y);
    y += 14;

    doc
      .font("Helvetica-Bold")
      .text("Reference: ", 50, y)
      .font("Helvetica")
      .text(reference, 115, y);
    y += 18;

    if (installmentLabel) {
      doc.roundedRect(50, y, 150, 20, 10).fillColor("#000000").fill();
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#ffffff")
        .text(installmentLabel, 50 + 10, y + 5);
      y += 40;
    }

    // ===== TABLE HEADER (purple bar) =====
    const tableX = 50;
    const tableWidth = 500;
    const descColWidth = 320;
    const amountColWidth = tableWidth - descColWidth;

    doc.roundedRect(tableX, y, tableWidth, 24, 4).fillColor(purple).fill();

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#ffffff")
      .text("Description", tableX + 10, y + 7, {
        width: descColWidth - 20,
      })
      .text("Amount", tableX + descColWidth + 10, y + 7, {
        width: amountColWidth - 20,
        align: "right",
      });

    y += 30;

    // ===== TABLE ROWS =====
    doc.font("Helvetica").fontSize(10).fillColor("#000000");

    // Principal row
    doc
      .text("Principal amount", tableX + 10, y, {
        width: descColWidth - 20,
      })
      .text(
        `${currency} ${principal.toFixed(2)}`,
        tableX + descColWidth + 10,
        y,
        {
          width: amountColWidth - 20,
          align: "right",
        }
      );
    y += 18;

    // Interest row
    doc
      .text("Interest amount", tableX + 10, y, {
        width: descColWidth - 20,
      })
      .text(
        `${currency} ${interest.toFixed(2)}`,
        tableX + descColWidth + 10,
        y,
        {
          width: amountColWidth - 20,
          align: "right",
        }
      );
    y += 30;

    // ===== TOTAL AMOUNT DUE BAR =====
    const totalBarHeight = 30;
    doc
      .roundedRect(tableX, y, tableWidth, totalBarHeight, 4)
      .fillColor(purple)
      .fill();

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#ffffff")
      .text("Total Amount Due", tableX + 10, y + 8, {
        width: descColWidth - 20,
      })
      .text(
        `${currency} ${total.toFixed(2)}`,
        tableX + descColWidth + 10,
        y + 8,
        {
          width: amountColWidth - 20,
          align: "right",
        }
      );

    y += totalBarHeight + 30;

    // ===== BOTTOM BOXES =====
    const boxWidth = 240;
    const boxHeight = 150;

    // Left: PAYMENT INSTRUCTIONS
    const leftBoxX = 50;
    const rightBoxX = leftBoxX + boxWidth + 20;

    doc
      .roundedRect(leftBoxX, y, boxWidth, boxHeight, 10)
      .lineWidth(1)
      .dash(3, { space: 2 })
      .strokeColor("#bbbbbb")
      .stroke()
      .undash();

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(purple)
      .text("PAYMENT INSTRUCTIONS", leftBoxX + 12, y + 10);

    let innerY = y + 28;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(greyText)
      .text(
        "Please pay the total amount due by the due date using the bank details below.",
        leftBoxX + 12,
        innerY,
        { width: boxWidth - 24 }
      );
    innerY += 32;

    doc
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Account name: ", leftBoxX + 12, innerY);
    doc
      .font("Helvetica")
      .text(BANK_DETAILS.accountName, leftBoxX + 100, innerY);
    innerY += 14;

    doc.font("Helvetica-Bold").text("Bank: ", leftBoxX + 12, innerY);
    doc.font("Helvetica").text(BANK_DETAILS.bank, leftBoxX + 100, innerY);
    innerY += 14;

    doc.font("Helvetica-Bold").text("Account number: ", leftBoxX + 12, innerY);
    doc
      .font("Helvetica")
      .text(BANK_DETAILS.accountNumber, leftBoxX + 100, innerY);
    innerY += 14;

    doc.font("Helvetica-Bold").text("Branch code: ", leftBoxX + 12, innerY);
    doc.font("Helvetica").text(BANK_DETAILS.branchCode, leftBoxX + 100, innerY);
    innerY += 18;

    // Reference badge (invoice number or reference)
    const refText = invoiceNumber;
    const refWidth =
      doc.widthOfString(refText, { font: "Helvetica-Bold", size: 9 }) + 20;
    doc
      .roundedRect(leftBoxX + 12, innerY, refWidth, 18, 9)
      .fillColor("#000000")
      .fill();
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#ffffff")
      .text(refText, leftBoxX + 12 + 8, innerY + 4);

    innerY += 24;

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(greyText)
      .text(
        "After payment, please upload your proof of payment in the Umoja app.",
        leftBoxX + 12,
        innerY,
        { width: boxWidth - 24 }
      );

    // Right: LATE PAYMENT REMINDER
    doc
      .roundedRect(rightBoxX, y, boxWidth, boxHeight, 10)
      .lineWidth(1)
      .dash(3, { space: 2 })
      .strokeColor("#bbbbbb")
      .stroke()
      .undash();

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(purple)
      .text("LATE PAYMENT", rightBoxX + 12, y + 10);
    doc.text("REMINDER", rightBoxX + 12, y + 22);

    let rightInnerY = y + 40;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(greyText)
      .text(
        "If this installment is not paid by the due date, Umoja will generate a Late Payment & Missed Installment Invoice for this installment amount, plus a 35% penalty fee, due within 7 days.\n\nFailure to pay that late invoice within 7 days may lead to loan cancellation and collateral being taken, in line with Umoja's Collateral Terms.",
        rightBoxX + 12,
        rightInnerY,
        { width: boxWidth - 24 }
      );

    // ===== FOOTER =====
    const footerY = y + boxHeight + 30;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(greyText)
      .text("Thank you for using UMOJA.", 50, footerY, { width: 200 });

    doc.text(
      "For any queries regarding this invoice, please contact support.",
      300,
      footerY,
      { width: 250, align: "right" }
    );

    doc.end();
  } catch (err) {
    console.error("getInvoicePdfController error:", err);
    if (!res.headersSent) {
      return res.status(500).json({
        status: false,
        message: "Failed to generate invoice PDF",
      });
    }
  }
}
