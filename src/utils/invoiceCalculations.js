// Single source of truth for invoice math on the frontend — used by the POS live cart summary
// and the receipt/PDF, so neither screen can drift from the other. Mirrors the backend's
// InvoiceCalculator (super-market-inv/.../util/InvoiceCalculator.java) field-for-field; keep
// the two in sync if the formula ever changes.

/**
 * @param {Array<{itemType: 'SERVICE'|'PRODUCT', unitPrice: number, quantity: number, discount: number, taxPercentage: number}>} items
 * @param {number} additionalDiscount overall/invoice-level discount, applied after tax
 */
export function calculateInvoiceTotals(items, additionalDiscount = 0) {
  const lines = items.map((item) => {
    const gross = Number(item.unitPrice || 0) * Number(item.quantity || 0);
    const discount = Number(item.discount || 0);
    const taxable = Math.max(0, gross - discount);
    const taxPercentage = Number(item.taxPercentage || 0);
    const taxAmount = (taxable * taxPercentage) / 100;
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
