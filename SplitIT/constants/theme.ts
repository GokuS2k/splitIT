/**
 * SUBTLE SYNTHWAVE Design System
 * Twilight purples · muted neon accents · soft contrast
 */

import { Platform } from 'react-native';

// ─── App-specific design tokens ───────────────────────────────────────────────

export const COLORS = {
  background: '#0A0A16',   // deep twilight
  surface: '#121127',   // muted indigo
  card: '#17142E',   // synth panel base
  cardAlt: '#1F1B3C',   // card highlight
  primary: '#6FE8FF',   // softened cyan
  primaryDark: '#4AB1C2',   // dimmed cyan
  secondary: '#D884FF',   // muted magenta
  success: '#7CF7C4',   // soft mint
  warning: '#FFD580',   // mellow amber
  text: '#F0EEFF',   // moonlight white
  textSecondary: '#ABA3D1',   // lavender-grey
  textMuted: '#655F84',   // muted violet
  border: '#6FE8FF26', // cyan faint border
  borderBright: '#D884FF66', // magenta medium border
  danger: '#FF6A9A',   // rose pink
  glow: '#A27CFF',   // violet glow tint
};

export const CURRENCY = '$';

export const USERS = ['Gokul', 'Rohan', 'Akilesh'];

export const USER_COLORS: Record<string, string> = {
  Gokul: '#6FE8FF', // cyan
  Rohan: '#7CF7C4', // mint
  Akilesh: '#D884FF', // magenta
};

// ─── Expo Router / themed components ──────────────────────────────────────────

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
