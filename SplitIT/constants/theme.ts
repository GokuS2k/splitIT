/**
 * RETRO-FUTURISTIC Design System
 * Deep space blacks · Neon cyan/magenta glows · Electric accents
 */

import { Platform } from 'react-native';

// ─── App-specific design tokens ───────────────────────────────────────────────

export const COLORS = {
  background: '#07070F',   // deep space black
  surface: '#0D0D1A',   // dark navy
  card: '#0F0F20',   // slightly lighter navy
  cardAlt: '#161628',   // card highlight
  primary: '#00F5FF',   // neon cyan
  primaryDark: '#00A8B5',   // dimmed cyan
  secondary: '#FF00CC',   // neon magenta
  success: '#00FF88',   // electric green
  warning: '#FFD200',   // amber gold
  text: '#E8E8FF',   // soft white-blue
  textSecondary: '#7878A8',   // muted purple-grey
  textMuted: '#3A3A5C',   // very muted
  border: '#00F5FF22', // neon cyan faint border
  borderBright: '#00F5FF66', // neon cyan medium border
  danger: '#FF2D55',   // neon red-pink
  glow: '#00F5FF',   // for shadow/glow effects
};

export const CURRENCY = '$';

export const USERS = ['Gokul', 'Rohan', 'Akilesh'];

export const USER_COLORS: Record<string, string> = {
  Gokul: '#00F5FF', // cyan
  Rohan: '#00FF88', // electric green
  Akilesh: '#FF00CC', // magenta
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
