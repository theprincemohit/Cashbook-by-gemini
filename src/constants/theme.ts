/**
 * CashDiary Design System
 *
 * Premium dark-themed design tokens used throughout the app.
 * Uses a deep navy/charcoal palette with emerald/teal accent gradients.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// ─── CashDiary Custom Theme ───────────────────────────────────────────────

export const AppColors = {
  // Backgrounds
  bgPrimary: '#0A0E1A',
  bgSecondary: '#141B2D',
  bgCard: 'rgba(255, 255, 255, 0.05)',
  bgCardBorder: 'rgba(255, 255, 255, 0.10)',
  bgInput: 'rgba(255, 255, 255, 0.07)',
  bgInputFocused: 'rgba(255, 255, 255, 0.12)',

  // Accent gradient endpoints
  accentStart: '#10B981', // Emerald
  accentEnd: '#06B6D4',   // Teal/Cyan
  accentSolid: '#10B981',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textPlaceholder: '#475569',

  // Functional
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.12)',
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',

  // Button
  buttonPrimary: '#10B981',
  buttonPrimaryPressed: '#059669',
  buttonDisabled: 'rgba(16, 185, 129, 0.4)',
  buttonTextDisabled: 'rgba(255, 255, 255, 0.5)',

  // Shadows / Glows
  glowAccent: 'rgba(16, 185, 129, 0.25)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
} as const;

export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const AppBorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const AppFontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  hero: 40,
} as const;
