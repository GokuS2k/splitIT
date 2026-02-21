/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// ─── App-specific design tokens ───────────────────────────────────────────────

export const COLORS = {
  background: '#0F0F0F',
  surface: '#1C1C1E',
  card: '#2C2C2E',
  cardAlt: '#3A3A3C',
  primary: '#7C6FF7',
  primaryLight: '#9D97FA',
  secondary: '#FF6B6B',
  success: '#30D158',
  warning: '#FFD60A',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#636366',
  border: '#38383A',
  danger: '#FF453A',
};

export const CURRENCY = '₹';

export const USERS = ['Gokul', 'Rohan', 'Akilesh'];

export const USER_COLORS: Record<string, string> = {
  Gokul: '#7C6FF7',
  Rohan: '#30D158',
  Akilesh: '#FF9F0A',
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
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
