# Receipt scanning implementation guide

## Folder structure

- `screens/ScanReceiptScreen.js`: camera/gallery flow, OCR call, parsed JSON editor, per-item split assignment UI, totals + save.
- `utils/receiptOcr.js`: on-device OCR wrapper around `expo-text-extractor`, including normalized line output.
- `utils/receiptParser.js`: resilient receipt parser that outputs strict JSON shape.
- `utils/firestore.js`: receipt scan + split expense read/write helpers.
- `tests/receiptParser.test.mjs`: parser unit tests with realistic noisy receipts.

## Free OCR approach (Expo + on-device)

Preferred package: `expo-text-extractor` (on-device OCR, no paid API).

### Install packages

```bash
npx expo install expo-image-picker expo-text-extractor
```

If package installation via your environment mirror is blocked, use your normal npm/expo registry in local dev.

### App config additions (`app.json`)

```json
{
  "expo": {
    "plugins": ["expo-text-extractor"],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Use camera to scan receipts",
        "NSPhotoLibraryUsageDescription": "Use photos to import receipts"
      }
    },
    "android": {
      "permissions": ["CAMERA", "READ_MEDIA_IMAGES"]
    }
  }
}
```

### EAS dev build steps

`expo-text-extractor` requires native code, so Expo Go is not enough.

```bash
npm install -g eas-cli
npx eas login
npx eas build:configure
npx eas build --profile development --platform android
# or
npx eas build --profile development --platform ios
npx expo start --dev-client
```

Install the generated dev client app on device/simulator, then run from it.

## Firestore collections

### `receipt_scans`
- `groupId: string`
- `createdBy: string`
- `imageUrl: string`
- `rawOcrText: string`
- `parsed: ReceiptParseJson`
- `createdAt: serverTimestamp`

### `expenses_v2`
- `groupId: string`
- `createdBy: string`
- `members: string[]` (3 roommates)
- `items: {name, qty, unit_price, line_total, raw}[]`
- `allocations: {itemRaw: string, members: string[]}[]`
- `subtotal: number | null`
- `tax: number | null`
- `total: number | null`
- `computedTotals: Record<string, number>`
- `taxMode: "equal" | "proportional"`
- `receiptScanId: string`
- `createdAt: serverTimestamp`
