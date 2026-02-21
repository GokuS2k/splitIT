const { normalizeOcrLines } = require('./receiptParser');

function tryRequire(moduleName) {
  try {
    return require(moduleName);
  } catch (_err) {
    return null;
  }
}

async function extractReceiptTextFromImage(imageUri) {
  const TextExtractor = tryRequire('expo-text-extractor');
  if (!TextExtractor) {
    return {
      rawText: '',
      lines: [],
      warning: 'expo-text-extractor is not installed. Install it and run an EAS dev build to enable on-device OCR.',
    };
  }

  const possibleFunctions = [
    TextExtractor.extractTextFromImageAsync,
    TextExtractor.extractFromUriAsync,
    TextExtractor.extractTextAsync,
  ].filter(Boolean);

  if (!possibleFunctions.length) {
    return { rawText: '', lines: [], warning: 'Could not find a compatible OCR function in expo-text-extractor.' };
  }

  const output = await possibleFunctions[0](imageUri);
  const rawText = typeof output === 'string'
    ? output
    : output?.text || output?.fullText || (Array.isArray(output?.blocks) ? output.blocks.map((b) => b.text).join('\n') : '');

  return { rawText, lines: normalizeOcrLines(rawText), warning: null };
}

module.exports = { extractReceiptTextFromImage };
