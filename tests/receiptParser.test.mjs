import test from 'node:test';
import assert from 'node:assert/strict';
import parser from '../utils/receiptParser.js';

const { parseReceiptText } = parser;

test('parses items, subtotal, tax, total with noisy spacing', () => {
  const text = `
  FRESH MART
  01/18/2026 10:22 AM
  MILK  3.49
  2 x 1.99 BANANA 3.98
  BREAD   2.50
  SUBTOTAL    9.97
  SALES TAX 0.80
  TOTAL 10.77
  CHANGE 4.23
  `;

  const parsed = parseReceiptText(text);
  assert.equal(parsed.merchant, 'FRESH MART');
  assert.equal(parsed.tax, 0.8);
  assert.equal(parsed.total, 10.77);
  assert.ok(parsed.items.length >= 3);
  assert.equal(parsed.currency, 'USD');
});

test('chooses final total candidate near the end and ignores CASH', () => {
  const text = `
  CORNER SHOP
  APPLE 2.00
  ORANGE 3.00
  SUBTOTAL 5.00
  TAX 0.50
  TOTAL 5.50
  CASH 20.00
  CHANGE 14.50
  AMOUNT DUE 5.50
  `;
  const parsed = parseReceiptText(text);
  assert.equal(parsed.total, 5.5);
  assert.equal(parsed.subtotal, 5);
  assert.equal(parsed.tax, 0.5);
});

test('adds warning when arithmetic mismatch is present', () => {
  const text = `
  TEST STORE
  ITEM A 4.00
  ITEM B 6.00
  SUBTOTAL 10.00
  TAX 1.00
  TOTAL 15.00
  `;
  const parsed = parseReceiptText(text);
  assert.ok(parsed.warnings.some((w) => w.includes('Total mismatch detected')));
});
