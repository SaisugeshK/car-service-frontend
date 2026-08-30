import dayjs from 'dayjs';
import { getCompanyDetails } from './invoicePdf';

// HRM/payroll — payslip PDF, generated entirely client-side with jsPDF (same approach as
// invoicePdf.js; there is no server-side PDF library in this app, and spec §26 says to reuse
// whatever already exists rather than add one). Built ONLY from the SalaryPayment fields the
// backend already returned (the frozen snapshot) — never re-fetches or recomputes from the
// employee's current salary configuration, so an edited/raised salary later can never change
// what an already-generated payslip shows (spec §28).
async function loadPdfLibs() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
}

// Mirrors invoicePdf.js's palette exactly (kept as its own copy rather than an import — the two
// files are independent utilities, same visual identity as the rest of the app's black+gold PDFs).
const PDF_CHARCOAL = [22, 22, 22];
const PDF_GOLD = [212, 175, 55];
const PDF_ACCENT_TEXT = [154, 115, 23];

function drawCompanyHeader(doc, company) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const lines = [company.address, [company.phone, company.email].filter(Boolean).join('  ·  ')].filter(Boolean);
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function money(v) {
  return Number(v ?? 0).toFixed(2);
}

/** Builds (but does not save) the payslip document. Returns the jsPDF instance. */
export async function buildPayslipDoc(payment, company) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();
  const periodLabel = `${MONTH_NAMES[(payment.payPeriodMonth || 1) - 1]} ${payment.payPeriodYear}`;

  let y = drawCompanyHeader(doc, company);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...PDF_ACCENT_TEXT);
  doc.text('PAYSLIP', 14, y);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  y += 8;
  doc.setFontSize(9);

  [
    [`Payslip No.: ${payment.paymentNumber || '-'}`, `Pay Period: ${periodLabel}`],
    [`Employee: ${payment.userName || '-'}`, `Employee ID: ${payment.userId}`],
    [`Designation: ${payment.roleName || '-'}`, `Status: ${payment.status}`],
  ].forEach(([l, r]) => {
    doc.text(l, 14, y);
    doc.text(r, 110, y);
    y += 6;
  });
  y += 2;

  doc.setFontSize(10);
  doc.text('ATTENDANCE', 14, y);
  autoTable(doc, {
    startY: y + 2,
    head: [['Working Days', 'Present Days', 'Absent Days', 'Paid Leave', 'Unpaid Leave']],
    body: [[payment.workingDays ?? '-', payment.presentDays ?? '-', payment.absentDays ?? '-', payment.paidLeaveDays ?? '-', payment.unpaidLeaveDays ?? '-']],
    styles: { fontSize: 9, halign: 'center' },
    headStyles: { fillColor: PDF_CHARCOAL, textColor: 255, lineColor: PDF_GOLD, lineWidth: 0.3 },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  const totalDeductions = Number(payment.deductions ?? 0) + Number(payment.attendanceDeductions ?? 0) + Number(payment.leaveDeductions ?? 0);

  const colWidth = (doc.internal.pageSize.getWidth() - 28) / 2;
  doc.setFontSize(10);
  doc.text('EARNINGS', 14, y);
  doc.text('DEDUCTIONS', 14 + colWidth + 4, y);
  autoTable(doc, {
    startY: y + 2,
    body: [
      ['Basic Pay', money(payment.basicPay)],
      ['HRA', money(payment.hra)],
      ['Other Allowances', money(payment.otherAllowances)],
      ['Overtime', money(payment.overtimeAmount)],
      ['Gross Earnings', money(payment.grossPay)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, halign: 'right' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 + colWidth + 4 },
    tableWidth: colWidth,
  });
  const earningsFinalY = doc.lastAutoTable.finalY;
  autoTable(doc, {
    startY: y + 2,
    body: [
      ['Absence Deduction', money(payment.attendanceDeductions)],
      ['Unpaid Leave Deduction', money(payment.leaveDeductions)],
      ['Other Deductions', money(payment.deductions)],
      ['Total Deductions', money(totalDeductions)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, halign: 'right' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
    margin: { left: 14 + colWidth + 4, right: 14 },
    tableWidth: colWidth,
  });
  y = Math.max(earningsFinalY, doc.lastAutoTable.finalY) + 10;

  doc.setFillColor(...PDF_CHARCOAL);
  doc.rect(14, y, doc.internal.pageSize.getWidth() - 28, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('NET PAY', 20, y + 9.5);
  doc.text(money(payment.netPay), doc.internal.pageSize.getWidth() - 20, y + 9.5, { align: 'right' });
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  y += 22;

  if (payment.status === 'PAID') {
    doc.setFontSize(9);
    doc.text(`Payment Date: ${payment.paidAt ? dayjs(payment.paidAt).format('DD MMM YYYY') : '-'}`, 14, y);
    doc.text(`Payment Method: ${payment.paymentMethod || '-'}`, 110, y);
    y += 6;
    if (payment.paymentReference) {
      doc.text(`Payment Reference: ${payment.paymentReference}`, 14, y);
      y += 6;
    }
  }

  doc.setFontSize(8);
  doc.text('This is a system-generated payslip and does not require a signature.', 14, y + 8);

  return doc;
}

const sanitizeForFilename = (s) => String(s || 'Employee').trim().replace(/[^a-zA-Z0-9]+/g, '_');

export function payslipFileName(payment) {
  const month = MONTH_NAMES[(payment.payPeriodMonth || 1) - 1];
  return `Payslip_${sanitizeForFilename(payment.userName)}_${month}_${payment.payPeriodYear}.pdf`;
}

export async function downloadPayslipPdf(payment) {
  const company = await getCompanyDetails();
  const doc = await buildPayslipDoc(payment, company);
  doc.save(payslipFileName(payment));
}
