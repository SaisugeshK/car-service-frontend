import { describe, it, expect } from 'vitest';
import { calculateInvoiceTotals, derivePaymentStatus } from './invoiceCalculations';

describe('calculateInvoiceTotals', () => {
  it('matches the backend for a clean round-number line', () => {
    const totals = calculateInvoiceTotals(
      [{ itemType: 'SERVICE', unitPrice: 300, quantity: 1, discount: 0, taxPercentage: 18 }],
      0
    );
    expect(totals.subtotal).toBe(300);
    expect(totals.taxAmount).toBe(54);
    expect(totals.grandTotal).toBe(354);
  });

  // Real case hit during backend production testing: qty=2, unitPrice=999.99, discount=200,
  // tax=18% produces a taxable base (1799.98) whose 18% is 323.9964 — a sub-paisa value. The
  // backend used to return this raw, then silently round to 324.00 on persist (a real
  // create-response-vs-persisted mismatch, fixed in InvoiceCalculator.java). This mirror must
  // round the same way so the live POS/estimate preview never disagrees with what the backend
  // will actually save.
  it('rounds to 2 decimal places like the backend, not a raw sub-paisa fraction', () => {
    const totals = calculateInvoiceTotals(
      [{ itemType: 'SERVICE', unitPrice: 999.99, quantity: 2, discount: 200, taxPercentage: 18 }],
      50
    );
    // Strict equality on the raw number, not .toFixed() — .toFixed(2) would mask the bug by
    // rounding at display time even while the underlying value stays 323.9964. Any downstream
    // math (further additions, comparisons) would still see the sub-paisa fraction.
    expect(totals.taxAmount).toBe(324);
    expect(totals.grandTotal).toBe(2073.98);
  });

  it('clamps a negative grand total to zero when discount exceeds the total', () => {
    const totals = calculateInvoiceTotals(
      [{ itemType: 'PRODUCT', unitPrice: 100, quantity: 1, discount: 0, taxPercentage: 0 }],
      500
    );
    expect(totals.grandTotal).toBe(0);
  });

  it('splits cgst/sgst so they always sum back to the tax amount exactly', () => {
    const totals = calculateInvoiceTotals(
      [{ itemType: 'SERVICE', unitPrice: 999.99, quantity: 2, discount: 200, taxPercentage: 18 }],
      50
    );
    expect(Number((totals.cgstAmount + totals.sgstAmount).toFixed(2))).toBe(Number(totals.taxAmount.toFixed(2)));
  });

  it('separates service and product subtotals correctly', () => {
    const totals = calculateInvoiceTotals(
      [
        { itemType: 'SERVICE', unitPrice: 500, quantity: 1, discount: 0, taxPercentage: 18 },
        { itemType: 'PRODUCT', unitPrice: 200, quantity: 3, discount: 0, taxPercentage: 0 },
      ],
      0
    );
    expect(totals.serviceSubtotal).toBe(500);
    expect(totals.productSubtotal).toBe(600);
    expect(totals.subtotal).toBe(1100);
  });

  it('handles an empty item list without crashing', () => {
    const totals = calculateInvoiceTotals([], 0);
    expect(totals.grandTotal).toBe(0);
    expect(totals.lines).toHaveLength(0);
  });
});

describe('derivePaymentStatus', () => {
  it('reports UNPAID at zero paid', () => {
    expect(derivePaymentStatus(1000, 0)).toBe('UNPAID');
  });
  it('reports PARTIAL between zero and total', () => {
    expect(derivePaymentStatus(1000, 400)).toBe('PARTIAL');
  });
  it('reports PAID at or above total', () => {
    expect(derivePaymentStatus(1000, 1000)).toBe('PAID');
    expect(derivePaymentStatus(1000, 1200)).toBe('PAID');
  });
});
