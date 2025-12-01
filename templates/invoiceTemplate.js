// templates/invoiceTemplate.js

export function renderInvoiceHtml(invoice) {
  const {
    invoiceNumber,
    issueDate,
    dueDate,
    type,
    reference,
    principalAmount = 0,
    interestAmount = 0,
    totalAmount = 0,
    currency = "ZAR",
    user = null, // populated user
    note,
  } = invoice;

  const customerName =
    invoice.customerName ||
    (user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : "Umoja Client");
  const customerPhone = invoice.customerPhone || (user && user.phone) || "";

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${invoiceNumber}</title>
    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 12px;
        color: #111827;
        margin: 0;
        padding: 24px;
      }
      .invoice-container {
        max-width: 800px;
        margin: 0 auto;
      }
      header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 24px;
      }
      .brand {
        font-weight: 700;
        font-size: 20px;
        color: #4c1580;
      }
      .brand-sub {
        font-size: 11px;
        color: #6b7280;
      }
      .meta {
        text-align: right;
        font-size: 11px;
        color: #6b7280;
      }
      h1 {
        font-size: 24px;
        margin: 16px 0;
      }
      .client, .details {
        margin-bottom: 16px;
        font-size: 12px;
      }
      .section-title {
        font-weight: 600;
        margin-bottom: 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
      }
      th, td {
        border-bottom: 1px solid #e5e7eb;
        padding: 8px 4px;
      }
      th {
        text-align: left;
        background: #f3f4f6;
        font-weight: 600;
        font-size: 11px;
      }
      .totals {
        width: 260px;
        margin-left: auto;
        font-size: 12px;
      }
      .totals td {
        border: none;
        padding: 4px 0;
      }
      .totals tr:last-child td {
        border-top: 1px solid #e5e7eb;
        font-weight: 700;
        padding-top: 8px;
      }
      .footer {
        margin-top: 24px;
        font-size: 10px;
        color: #9ca3af;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <header>
        <div>
          <div class="brand">UMOJA</div>
          <div class="brand-sub">Digital Cooperative Slip</div>
        </div>
        <div class="meta">
          <div><strong>Invoice:</strong> ${invoiceNumber}</div>
          <div><strong>Issued:</strong> ${
            issueDate ? new Date(issueDate).toLocaleDateString() : ""
          }</div>
          <div><strong>Due:</strong> ${
            dueDate ? new Date(dueDate).toLocaleDateString() : ""
          }</div>
        </div>
      </header>

      <h1>Invoice / Slip</h1>

      <section class="client">
        <div class="section-title">Billed to:</div>
        <div>${customerName}</div>
        ${customerPhone ? `<div>${customerPhone}</div>` : ""}
      </section>

      <section class="details">
        <div class="section-title">Details</div>
        <div>Type: <strong>${type}</strong></div>
        ${
          reference ? `<div>Reference: <strong>${reference}</strong></div>` : ""
        }
      </section>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:right;">Amount (${currency})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Principal</td>
            <td style="text-align:right;">${principalAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Interest</td>
            <td style="text-align:right;">${interestAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <table class="totals">
        <tr>
          <td>Principal:</td>
          <td style="text-align:right;">${principalAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Interest:</td>
          <td style="text-align:right;">${interestAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Total:</td>
          <td style="text-align:right;">${totalAmount.toFixed(2)}</td>
        </tr>
      </table>

      ${
        note
          ? `<div style="font-size:11px;margin-top:8px;"><strong>Note:</strong> ${note}</div>`
          : ""
      }

      <div class="footer">
        Thank you for using Umoja. This is a system-generated slip used as a payment reference.
      </div>
    </div>
  </body>
</html>
`;
}
