/**
 * TillMate Layout Constants
 * Designed for farmer-friendly, glove-compatible touch targets
 */

export const Layout = {
  // Touch targets (glove-friendly)
  minTouchTarget: 72,        // Minimum touch target size (dp)
  estopMinHeight: 88,        // Emergency stop button minimum height
  buttonMinHeight: 56,       // Standard button height

  // Dashboard tiles
  dashTileMinWidth: 100,
  dashTileMinHeight: 70,
  dashTileGap: 8,

  // Spacing scale
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Border radius
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 9999,
  },

  // Typography sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    title: 32,
    hero: 48,
  },

  // Font weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Screen padding
  screenPadding: 16,

  // Bottom sheet
  bottomSheetHandleHeight: 24,

  // Map
  mapControlSize: 44,
  workPointMarkerSize: 32,

  // Control panel
  sliderHeight: 60,
  sliderThumbSize: 32,
  relayButtonSize: 80,

  // Connection banner
  bannerHeight: 48,

  // Safe area (will be overridden by device)
  safeAreaTop: 44,
  safeAreaBottom: 34,
};

// Screen breakpoints (for responsive design if needed)
export const Breakpoints = {
  phone: 0,
  tablet: 768,
};
