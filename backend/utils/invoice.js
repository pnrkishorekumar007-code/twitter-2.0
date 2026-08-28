import PDFDocument from "pdfkit";

// Generates a subscription invoice as a PDF buffer.
// Note: standard PDFKit fonts only cover WinAnsi glyphs, so we render the
// currency as "Rs." (₹ isn't available without embedding a custom font).
export async function generateInvoicePdf({
  invoiceNumber,
  customerName,
  customerEmail,
  planName,
  amount,
  paymentId,
  orderId,
  purchaseDate,
  expiryDate,
}) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Header
  doc.fontSize(24).fillColor("#1d9bf0").text("Twiller", { continued: false });
  doc.moveDown(0.2);
  doc.fontSize(16).fillColor("#111").text("Subscription Invoice");
  doc.moveDown(1.5);

  // Invoice meta block
  doc.fontSize(11).fillColor("#333");
  doc.text(`Invoice Number: ${invoiceNumber}`);
  doc.text(`Date: ${purchaseDate}`);
  doc.moveDown(1);

  // Customer block
  doc.fontSize(12).fillColor("#111").text("Billed To");
  doc.fontSize(11).fillColor("#333");
  doc.text(`Name: ${customerName}`);
  doc.text(`Email: ${customerEmail}`);
  doc.moveDown(1.5);

  // Table header
  doc.fontSize(11).fillColor("#fff");
  doc.rect(50, doc.y, 60, 24).fill("#1d9bf0");
  doc.rect(110, doc.y, 130, 24).fill("#1d9bf0");
  doc.rect(240, doc.y, 130, 24).fill("#1d9bf0");
  doc.rect(370, doc.y, 100, 24).fill("#1d9bf0");
  doc.rect(470, doc.y, 90, 24).fill("#1d9bf0");
  doc.text("Order ID", 55, doc.y + 7, { width: 55 });
  doc.text("Payment ID", 115, doc.y + 7, { width: 120 });
  doc.text("Plan", 245, doc.y + 7, { width: 120 });
  doc.text("Amount", 375, doc.y + 7, { width: 90 });
  doc.text("Expiry", 475, doc.y + 7, { width: 80 });

  doc.moveDown(0.8);
  doc.fillColor("#333").fontSize(11);
  doc.text(orderId, 55, doc.y + 2, { width: 55 });
  doc.text(paymentId, 115, doc.y + 2, { width: 120 });
  doc.text(planName, 245, doc.y + 2, { width: 120 });
  doc.text(`Rs. ${amount}`, 375, doc.y + 2, { width: 90 });
  doc.text(expiryDate, 475, doc.y + 2, { width: 80 });

  doc.moveDown(2);
  doc
    .fontSize(10)
    .fillColor("#888")
    .text("Thank you for choosing Twiller.", 50, doc.y, { width: 500 });

  doc.end();
  return done;
}
