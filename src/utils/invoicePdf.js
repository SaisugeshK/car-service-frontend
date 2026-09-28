import dayjs from 'dayjs';
import api from '../api/axios';

// jsPDF + autotable are a large dependency (~300KB) needed only when someone actually clicks
// Download/Print/Share — not on every page load. Dynamic-imported here so it lands in its own
// chunk instead of bloating whichever page's bundle happens to import this file.
async function loadPdfLibs() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
}

// Overpayment shows as credit, never a negative "balance due" — a negative number reads as a
// bug to a billing staff member, not a feature.
export function balanceLabel(balanceAmount) {
  const balance = Number(balanceAmount ?? 0);
  if (balance < 0) return { label: 'Overpayment / Credit', value: Math.abs(balance), tone: 'info' };
  return { label: 'Balance Due', value: balance, tone: balance > 0 ? 'danger' : 'success' };
}

let cachedCompany = null;
// Settings.jsx calls this right after saving so a PDF generated in the same session picks up
// the new values immediately, instead of showing the stale cache until a hard refresh.
export function invalidateCompanyDetailsCache() {
  cachedCompany = null;
}

const DEFAULT_TERMS = 'This is an estimate, not a bill — final invoice reflects only approved work.';
const DEFAULT_FOOTER = 'Thank you for visiting us.';

export async function getCompanyDetails() {
  if (cachedCompany) return cachedCompany;
  try {
    // /company-details, not /settings — it's readable by an EMPLOYEE too (payslip PDFs), and
    // exposes only the letterhead keys, never the full settings table.
    const details = await api.get('/company-details').then((res) => res.data || {});
    const get = (key, fallback) => details[key] || fallback;
    cachedCompany = {
      name: get('company_name', 'AutoCare ERP'),
      address: get('company_address', ''),
      phone: get('company_phone', ''),
      whatsapp: get('company_whatsapp', ''),
      email: get('company_email', ''),
      gstin: get('company_gstin', ''),
      logo: get('company_logo', ''),
      terms: get('invoice_terms', ''),
      footer: get('invoice_footer', DEFAULT_FOOTER),
    };
  } catch {
    cachedCompany = { name: 'AutoCare ERP', address: '', phone: '', whatsapp: '', email: '', gstin: '', logo: '', terms: '', footer: DEFAULT_FOOTER };
  }
  return cachedCompany;
}

// Same black + gold identity as the rest of the app (--erp-charcoal / --erp-gold / --erp-primary
// in index.css) — jsPDF can't read CSS custom properties, so these are the same values mirrored
// as RGB triplets. PDF_ACCENT_TEXT is the darker "on white paper" gold (matches --erp-primary)
// so headings stay legible/printer-friendly; PDF_GOLD is the brighter brand gold, used only as a
// thin accent rule, never as a large filled/printed area (poor ink contrast for text at that tone).
const PDF_CHARCOAL = [22, 22, 22];
const PDF_GOLD = [212, 175, 55];
const PDF_ACCENT_TEXT = [154, 115, 23];

function drawCompanyHeader(doc, company) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const lines = [company.address, [company.phone, company.email].filter(Boolean).join('  ·  '), company.gstin ? `GSTIN: ${company.gstin}` : null].filter(Boolean);
  const bandHeight = 20 + lines.length * 5;

  doc.setFillColor(...PDF_CHARCOAL);
  doc.rect(0, 0, pageWidth, bandHeight, 'F');
  doc.setFillColor(...PDF_GOLD);
  doc.rect(0, bandHeight, pageWidth, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont(undefined, 'bold');
  doc.text(company.name, 14, 15);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text(lines, 14, 21);

  doc.setTextColor(0, 0, 0);
  return bandHeight + 9;
}

/** Builds (but does not save) the tax invoice document. Returns the jsPDF instance. */
export async function buildInvoiceDoc(invoice, company) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();
  const services = (invoice.items || []).filter((l) => l.itemType === 'SERVICE');
  const products = (invoice.items || []).filter((l) => l.itemType !== 'SERVICE');

  let y = drawCompanyHeader(doc, company);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...PDF_ACCENT_TEXT);
  doc.text('TAX INVOICE', 14, y);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  y += 8;
  doc.setFontSize(9);

  [
    [`Invoice No.: ${invoice.invoiceNumber}`, `Date: ${dayjs(invoice.invoiceDate || invoice.createdAt).format('DD MMM YYYY')}`],
    [`Customer: ${invoice.customerName || '-'}`, `Mobile: ${invoice.customerPhone || '-'}`],
    [`Vehicle: ${invoice.vehicleModel || '-'}`, `Registration: ${invoice.registrationNumber || '-'}`],
    [`Odometer: ${invoice.odometer ? `${invoice.odometer} km` : '-'}`, `Payment: ${invoice.paymentMethod || '-'}`],
  ].forEach(([l, r]) => {
    doc.text(l, 14, y);
    doc.text(r, 110, y);
    y += 6;
  });
  y += 2;

  const table = (title, rows) => {
    if (rows.length === 0) return;
    doc.setFontSize(10);
    doc.text(title, 14, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Description', 'Qty', 'Rate', 'GST', 'Amount']],
      body: rows.map((l) => [
        l.description || l.itemName,
        String(l.quantity),
        Number(l.unitPrice).toFixed(2),
        `${Number(l.taxPercentage ?? 0)}%`,
        Number(l.totalAmount).toFixed(2),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: PDF_CHARCOAL, textColor: 255, lineColor: PDF_GOLD, lineWidth: 0.3 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  };
  table('SERVICES', services);
  table('PRODUCTS / SPARE PARTS', products);

  const { label: balLabel, value: balValue } = balanceLabel(invoice.balanceAmount);
  const summary = [
    ['Subtotal', Number(invoice.subtotal ?? 0).toFixed(2)],
    ...(invoice.couponCode
      ? [[`Offer: ${invoice.offerName} (${invoice.couponCode})`, Number(invoice.offerDiscountAmount ?? 0).toFixed(2)]]
      : []),
    ['Discount', Number(invoice.discountAmount ?? 0).toFixed(2)],
    ['CGST', Number(invoice.cgstAmount ?? 0).toFixed(2)],
    ['SGST', Number(invoice.sgstAmount ?? 0).toFixed(2)],
    ['Grand Total', Number(invoice.grandTotal ?? 0).toFixed(2)],
    ['Paid', Number(invoice.paidAmount ?? 0).toFixed(2)],
    [balLabel, balValue.toFixed(2)],
    ['Payment Status', invoice.paymentStatus || '-'],
  ];

  autoTable(doc, {
    startY: y,
    body: summary,
    theme: 'plain',
    styles: { fontSize: 9, halign: 'right' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
    margin: { left: 118 },
  });

  const finalY = doc.lastAutoTable.finalY + 14;
  doc.setFontSize(8);
  doc.text(company.footer || DEFAULT_FOOTER, 14, finalY);
  doc.text(company.terms || 'Terms & Conditions apply.', 14, finalY + 5);
  doc.text('Authorized Signature: ____________________', 130, finalY + 20);

  return doc;
}

/** Builds (but does not save) a payment receipt document. Returns the jsPDF instance. */
export async function buildReceiptDoc(payment, invoice, company) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();
  let y = drawCompanyHeader(doc, company);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...PDF_ACCENT_TEXT);
  doc.text('PAYMENT RECEIPT', 14, y);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  y += 8;
  doc.setFontSize(9);

  const { label: balLabel, value: balValue } = balanceLabel(invoice?.balanceAmount);

  [
    [`Receipt No.: RCPT-${payment.transactionId}`, `Date: ${dayjs(payment.paymentDate).format('DD MMM YYYY, HH:mm')}`],
    [`Customer: ${invoice?.customerName || '-'}`, `Mobile: ${invoice?.customerPhone || '-'}`],
    [`Invoice No.: ${invoice?.invoiceNumber || '-'}`, `Vehicle: ${invoice?.vehicleModel || '-'} (${invoice?.registrationNumber || '-'})`],
  ].forEach(([l, r]) => {
    doc.text(l, 14, y);
    doc.text(r, 105, y);
    y += 6;
  });
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Payment Method', 'Reference', 'Received By', 'Amount Received']],
    body: [[payment.paymentMethod || '-', payment.transactionReference || '-', payment.receivedByName || '-', Number(payment.amount ?? 0).toFixed(2)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: PDF_CHARCOAL, textColor: 255, lineColor: PDF_GOLD, lineWidth: 0.3 },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 6;

  if (payment.notes) {
    doc.setFontSize(8);
    doc.text(`Notes: ${payment.notes}`, 14, y);
    y += 6;
  }

  if (invoice) {
    autoTable(doc, {
      startY: y,
      body: [
        ['Invoice Grand Total', Number(invoice.grandTotal ?? 0).toFixed(2)],
        ['Total Paid to Date', Number(invoice.paidAmount ?? 0).toFixed(2)],
        [balLabel, balValue.toFixed(2)],
        ['Payment Status', invoice.paymentStatus || '-'],
      ],
      theme: 'plain',
      styles: { fontSize: 9, halign: 'right' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
      margin: { left: 118 },
    });
    y = doc.lastAutoTable.finalY;
  }

  doc.setFontSize(8);
  doc.text('Thank you for your payment.', 14, y + 14);

  return doc;
}

/** Builds (but does not save) an estimate document — customer-requested and recommended work
 *  are kept in separate tables, mirroring the Estimate tab's grouping. Returns the jsPDF instance. */
export async function buildEstimateDoc(estimate, jobCard, company) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();
  const items = estimate.items || [];
  const requested = items.filter((l) => l.workCategory === 'CUSTOMER_REQUESTED');
  const recommended = items.filter((l) => l.workCategory !== 'CUSTOMER_REQUESTED');

  let y = drawCompanyHeader(doc, company);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...PDF_ACCENT_TEXT);
  doc.text('ESTIMATE', 14, y);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  y += 8;
  doc.setFontSize(9);

  [
    [`Estimate No.: ${estimate.estimateNumber}${(estimate.revisionNumber || 1) > 1 ? ` REV ${estimate.revisionNumber}` : ''}`, `Date: ${dayjs(estimate.createdAt).format('DD MMM YYYY')}`],
    [`Customer: ${estimate.customerName || jobCard?.customerName || '-'}`, `Mobile: ${jobCard?.customerPhone || '-'}`],
    [`Vehicle: ${jobCard?.vehicleModel || '-'}`, `Registration: ${jobCard?.registrationNumber || '-'}`],
    [`Valid Until: ${estimate.validUntil ? dayjs(estimate.validUntil).format('DD MMM YYYY') : '-'}`, `Status: ${estimate.status}`],
  ].forEach(([l, r]) => {
    doc.text(l, 14, y);
    doc.text(r, 110, y);
    y += 6;
  });
  y += 2;

  const table = (title, rows) => {
    if (rows.length === 0) return;
    doc.setFontSize(10);
    doc.text(title, 14, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Description', 'Qty', 'Rate', 'GST', 'Amount']],
      body: rows.map((l) => [
        l.description || l.itemName,
        String(l.quantity),
        Number(l.unitPrice).toFixed(2),
        `${Number(l.taxPercentage ?? 0)}%`,
        Number(l.totalAmount).toFixed(2),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: PDF_CHARCOAL, textColor: 255, lineColor: PDF_GOLD, lineWidth: 0.3 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  };
  table('CUSTOMER REQUESTED', requested);
  table('RECOMMENDED BY TECHNICIAN', recommended);

  autoTable(doc, {
    startY: y,
    body: [
      ['Subtotal', Number(estimate.subtotal ?? 0).toFixed(2)],
      ['Discount', Number(estimate.discountAmount ?? 0).toFixed(2)],
      ['Tax', Number(estimate.taxAmount ?? 0).toFixed(2)],
      ['Estimated Total', Number(estimate.grandTotal ?? 0).toFixed(2)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, halign: 'right' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
    margin: { left: 118 },
  });

  const finalY = doc.lastAutoTable.finalY + 14;
  doc.setFontSize(8);
  doc.text('This is an estimate, not a bill — final invoice reflects only approved work.', 14, finalY);
  if (company.terms) doc.text(company.terms, 14, finalY + 5);

  return doc;
}

/** Plain-text summary used for WhatsApp/SMS message bodies and the "Copy" action — same content
 *  the PDF shows, in a form that fits a chat message. */
export function estimateSummaryText(estimate, jobCard, company) {
  const requested = (estimate.items || []).filter((l) => l.workCategory === 'CUSTOMER_REQUESTED');
  const recommended = (estimate.items || []).filter((l) => l.workCategory !== 'CUSTOMER_REQUESTED');
  const lineText = (l) => `- ${l.description || l.itemName} x${l.quantity} = ${Number(l.totalAmount).toFixed(2)}`;

  const revSuffix = (estimate.revisionNumber || 1) > 1 ? ` REV ${estimate.revisionNumber}` : '';
  const parts = [
    `${company?.name || 'AutoCare ERP'} — Estimate ${estimate.estimateNumber}${revSuffix}`,
    `${estimate.customerName || jobCard?.customerName || ''} · ${jobCard?.vehicleModel || ''} (${jobCard?.registrationNumber || ''})`,
    '',
  ];
  if (requested.length > 0) parts.push('Customer Requested:', ...requested.map(lineText), '');
  if (recommended.length > 0) parts.push('Recommended:', ...recommended.map(lineText), '');
  parts.push(`Estimated Total: ${Number(estimate.grandTotal ?? 0).toFixed(2)}`);
  if (estimate.validUntil) parts.push(`Valid until: ${dayjs(estimate.validUntil).format('DD MMM YYYY')}`);
  return parts.join('\n');
}

const estimateFileName = (estimate) =>
  `${estimate.estimateNumber}${(estimate.revisionNumber || 1) > 1 ? `-REV${estimate.revisionNumber}` : ''}.pdf`;

export async function downloadEstimatePdf(estimate, jobCard) {
  const company = await getCompanyDetails();
  const doc = await buildEstimateDoc(estimate, jobCard, company);
  doc.save(estimateFileName(estimate));
}

/** Web Share API when available (mobile browsers, HTTPS), falls back to a plain download. */
export async function shareEstimatePdf(estimate, jobCard) {
  const company = await getCompanyDetails();
  const doc = await buildEstimateDoc(estimate, jobCard, company);
  const fileName = estimateFileName(estimate);
  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `Estimate ${estimate.estimateNumber}`,
      text: `Estimate ${estimate.estimateNumber} for ${estimate.customerName || jobCard?.customerName || 'customer'} — ${company.name}`,
    });
    return 'shared';
  }
  doc.save(fileName);
  return 'downloaded';
}

export async function downloadInvoicePdf(invoice) {
  const company = await getCompanyDetails();
  const doc = await buildInvoiceDoc(invoice, company);
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

export async function downloadReceiptPdf(payment, invoice) {
  const company = await getCompanyDetails();
  const doc = await buildReceiptDoc(payment, invoice, company);
  doc.save(`Receipt-${payment.transactionId}.pdf`);
}

/** Web Share API when available (mobile browsers, HTTPS), falls back to a plain download. */
export async function shareInvoicePdf(invoice) {
  const company = await getCompanyDetails();
  const doc = await buildInvoiceDoc(invoice, company);
  const fileName = `${invoice.invoiceNumber}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `Invoice ${invoice.invoiceNumber}`,
      text: `Invoice ${invoice.invoiceNumber} for ${invoice.customerName || 'customer'} — ${company.name}`,
    });
    return 'shared';
  }
  doc.save(fileName);
  return 'downloaded';
}
