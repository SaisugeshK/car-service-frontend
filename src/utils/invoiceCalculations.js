// Single source of truth for invoice math on the frontend — used by the POS live cart summary
// and the receipt/PDF, so neither screen can drift from the other. Mirrors the backend's
// InvoiceCalculator (super-market-inv/.../util/InvoiceCalculator.java) field-for-field; keep
// the two in sync if the formula ever changes.

/**
 * @param {Array<{itemType: 'SERVICE'|'PRODUCT', unitPrice: number, quantity: number, discount: number, taxPercentage: number}>} items
 * @param {number} additionalDiscount overall/invoice-level discount, applied after tax
 */
// Round-half-up to 2 decimal places (paisa) — matches java.math.RoundingMode.HALF_UP on the
// backend's InvoiceCalculator. Plain `taxable * pct / 100` can land on a value like 323.9964,
// which used to differ from what the backend persists (324.00) once it rounds on save — this
// mirror rounds at the same point so the live POS/estimate preview never disagrees with what
// gets confirmed. toFixed() alone isn't enough here since only the *stored* number needs to be
// exact — callers that add/compare taxAmount before formatting must see the rounded value too.
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateInvoiceTotals(items, additionalDiscount = 0) {
  const lines = items.map((item) => {
    const gross = Number(item.unitPrice || 0) * Number(item.quantity || 0);
    const discount = Number(item.discount || 0);
    const taxable = Math.max(0, gross - discount);
    const taxPercentage = Number(item.taxPercentage || 0);
    const taxAmount = round2((taxable * taxPercentage) / 100);
    const totalAmount = taxable + taxAmount;
    return { itemType: item.itemType, gross, discount, taxable, taxPercentage, taxAmount, totalAmount };
  });

  const serviceSubtotal = lines.filter((l) => l.itemType === 'SERVICE').reduce((s, l) => s + l.gross, 0);
  const productSubtotal = lines.filter((l) => l.itemType !== 'SERVICE').reduce((s, l) => s + l.gross, 0);
  const subtotal = serviceSubtotal + productSubtotal;
  const lineDiscountTotal = lines.reduce((s, l) => s + l.discount, 0);
  const taxAmount = lines.reduce((s, l) => s + l.taxAmount, 0);
  const discount = Number(additionalDiscount || 0);
  const discountAmount = lineDiscountTotal + discount;
  const cgstAmount = taxAmount / 2;
  const sgstAmount = taxAmount - cgstAmount;

  let grandTotal = subtotal - lineDiscountTotal + taxAmount - discount;
  if (grandTotal < 0) grandTotal = 0;

  return {
    lines,
    serviceSubtotal,
    productSubtotal,
    subtotal,
    lineDiscountTotal,
    additionalDiscount: discount,
    discountAmount,
    taxAmount,
    cgstAmount,
    sgstAmount,
    grandTotal,
  };
}

/** Same PAID/PARTIAL/UNPAID rule as the backend — for display-only previews before submit. */
export function derivePaymentStatus(grandTotal, paidAmount) {
  const total = Number(grandTotal || 0);
  const paid = Number(paidAmount || 0);
  if (paid >= total) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'UNPAID';
}
