const MONEY_PATTERN = /(-?\$?\d+[\d,]*\.\d{2})(?!.*\d)/;
const DATE_PATTERN = /(\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b|\b\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}\b)/;

function toNumber(text) {
  if (text == null) return null;
  const cleaned = String(text).replace(/[^\d.-]/g, '');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function normalizeOcrLines(rawText) {
  if (!rawText) return [];
  return rawText
    .replace(/\t/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function extractQtyAndUnit(line) {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*[xX]\s*\$?(\d+(?:\.\d{1,2})?)/,
    /qty\s*[:]?\s*(\d+(?:\.\d+)?).*?\$?(\d+(?:\.\d{1,2})?)\s*(?:ea|each)?/i,
    /(\d+(?:\.\d+)?)\s*(?:ea|each)\s*\$?(\d+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const qty = toNumber(match[1]);
      const unitPrice = toNumber(match[2]);
      if (qty && unitPrice) {
        return {
          qty,
          unit_price: unitPrice,
          line_total: Number((qty * unitPrice).toFixed(2)),
        };
      }
    }
  }

  return { qty: null, unit_price: null, line_total: null };
}

function hasIgnoredKeyword(upper) {
  return /(CASH|CHANGE|TENDER|BALANCE\s+DUE|CARD|VISA|MASTERCARD|DEBIT|CREDIT|AUTH|APPROVED)/.test(upper);
}

function parseReceiptText(rawText) {
  const lines = normalizeOcrLines(rawText);
  const result = {
    merchant: lines[0] || null,
    date: null,
    currency: 'USD',
    items: [],
    subtotal: null,
    tax: null,
    total: null,
    tip: null,
    discount: null,
    confidence: { items: 0, tax: 0, total: 0, overall: 0 },
    warnings: [],
  };

  if (!lines.length) {
    result.warnings.push('No OCR text lines detected.');
    return result;
  }

  const totalCandidates = [];
  lines.forEach((line, index) => {
    const upper = line.toUpperCase();
    if (!result.date) {
      const dateMatch = line.match(DATE_PATTERN);
      if (dateMatch) result.date = dateMatch[0];
    }

    const amountMatch = line.match(MONEY_PATTERN);
    const trailingAmount = amountMatch ? toNumber(amountMatch[1]) : null;

    if (/SUB\s*TOTAL/.test(upper) && trailingAmount != null) return void (result.subtotal = trailingAmount);
    if (/(SALES\s+)?TAX\b/.test(upper) && trailingAmount != null) return void (result.tax = trailingAmount);
    if (/\bTIP\b/.test(upper) && trailingAmount != null) return void (result.tip = trailingAmount);
    if (/(DISCOUNT|COUPON|SAVINGS)/.test(upper) && trailingAmount != null) return void (result.discount = trailingAmount);

    if (/(GRAND\s+TOTAL|AMOUNT\s+DUE|\bTOTAL\b)/.test(upper) && trailingAmount != null) {
      if (!hasIgnoredKeyword(upper)) totalCandidates.push({ value: trailingAmount, index });
      return;
    }

    if (hasIgnoredKeyword(upper) || /(TAX|TOTAL|SUBTOTAL|TIP|DISCOUNT)/.test(upper)) return;

    if (trailingAmount != null && /[A-Z]/i.test(line)) {
      const name = line.replace(MONEY_PATTERN, '').replace(/\s{2,}/g, ' ').trim();
      if (name.length > 1) {
        const qtyData = extractQtyAndUnit(line);
        result.items.push({
          name,
          qty: qtyData.qty,
          unit_price: qtyData.unit_price,
          line_total: qtyData.line_total ?? trailingAmount,
          raw: line,
        });
      }
    }
  });

  if (totalCandidates.length > 0) {
    const nearEnd = totalCandidates.filter((candidate) => candidate.index >= lines.length * 0.5);
    const pool = nearEnd.length ? nearEnd : totalCandidates;
    result.total = pool.reduce((best, curr) => (curr.value > best.value ? curr : best)).value;
  }

  if (result.subtotal == null && result.items.length) {
    result.subtotal = Number(result.items.reduce((sum, item) => sum + (item.line_total || 0), 0).toFixed(2));
    result.warnings.push('Subtotal inferred from line items.');
  }

  if (result.total == null && result.subtotal != null) {
    const computed = result.subtotal + (result.tax || 0) + (result.tip || 0) - (result.discount || 0);
    result.total = Number(computed.toFixed(2));
    result.warnings.push('Total inferred from subtotal/tax/tip/discount.');
  }

  if (result.total != null && result.subtotal != null) {
    const expected = result.subtotal + (result.tax || 0) + (result.tip || 0) - (result.discount || 0);
    if (Math.abs(result.total - expected) > 0.05) {
      result.warnings.push(`Total mismatch detected (expected ${expected.toFixed(2)}, got ${result.total.toFixed(2)}).`);
    }
  }

  result.confidence.items = Number(Math.min(1, result.items.length / Math.max(lines.length / 3, 1)).toFixed(2));
  result.confidence.tax = result.tax != null ? 0.9 : 0.3;
  result.confidence.total = result.total != null ? 0.9 : 0.2;
  result.confidence.overall = Number(((result.confidence.items + result.confidence.tax + result.confidence.total) / 3).toFixed(2));

  return result;
}

module.exports = { toNumber, normalizeOcrLines, parseReceiptText };
