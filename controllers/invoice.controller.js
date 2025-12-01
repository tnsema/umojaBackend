// controllers/invoice.controller.js

import {
  createInvoice,
  getInvoiceById,
  getInvoicesForUser,
  generateInvoicePdf,
} from "../services/invoice.service.js";

/**
 * POST /api/invoices
 * Generic invoice creation for logged in user.
 * Body: { type, reference, principalAmount, interestAmount, totalAmount?, dueDate, currency?, note?, metadata? }
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
    } = req.body;

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
      message: "Invoice created",
      data: { invoice },
    });
  } catch (err) {
    console.error("createInvoiceController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while creating invoice.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /api/invoices/:id
 * Get single invoice (JSON)
 */
export async function getInvoiceController(req, res) {
  try {
    const { id } = req.params;
    const invoice = await getInvoiceById(id);

    return res.json({
      status: true,
      message: "Invoice fetched successfully",
      data: { invoice },
    });
  } catch (err) {
    console.error("getInvoiceController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while fetching invoice.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /api/invoices/me
 * Logged-in user's invoices
 */
export async function getMyInvoicesController(req, res) {
  try {
    const userId = req.payload?.userId;

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "User is not authenticated",
      });
    }

    const { page, limit } = req.query;
    const result = await getInvoicesForUser(userId, { page, limit });

    return res.json({
      status: true,
      message: "Invoices fetched successfully",
      data: result,
    });
  } catch (err) {
    console.error("getMyInvoicesController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while fetching user invoices.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}

/**
 * GET /api/invoices/:id/pdf
 * Return the invoice as a PDF file
 */
export async function getInvoicePdfController(req, res) {
  try {
    const { id } = req.params;

    const { pdfBuffer, invoice } = await generateInvoicePdf(id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`
    );

    return res.send(pdfBuffer);
  } catch (err) {
    console.error("getInvoicePdfController error:", err);
    const statusCode = err.statusCode || 500;
    const message =
      err.message || "An unexpected error occurred while generating PDF.";

    return res.status(statusCode).json({
      status: false,
      message,
    });
  }
}
