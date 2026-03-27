/**
 * TillMate Color System
 * Derived from the TillMate logo
 */

export const Colors = {
  // Primary palette (from logo)
  primary: '#4A7C23',        // TillMate green (TILL text, leaves)
  primaryLight: '#6B9B3A',   // Lighter green (gear center)
  primaryDark: '#3A6318',    // Darker green for pressed states

  // Secondary palette
  earth: '#A67C3D',          // Earth brown (tiller body)
  earthLight: '#C49A5A',     // Lighter brown
  earthDark: '#8B6628',      // Darker brown

  // Neutral palette
  dark: '#333333',           // Dark gray (MATE text, gear)
  darkLight: '#555555',

  // Background colors
  background: '#121212',     // Dark background
  surface: '#1E1E1E',        // Card/surface background
  surfaceLight: '#2A2A2A',   // Elevated surface

  // Semantic colors
  success: '#4A7C23',        // Same as primary (green = good)
  warning: '#E65100',        // Orange warning
  danger: '#C62828',         // Red danger
  estop: '#B71C1C',          // Emergency stop red (darker, more urgent)

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#9E9E9E',
  textDisabled: '#616161',

  // Status colors
  connected: '#4A7C23',
  disconnected: '#C62828',
  connecting: '#E65100',

  // UI elements
  border: '#333333',
  divider: '#2A2A2A',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Tile/dashboard colors
  tileBattery: '#4A7C23',
  tileGps: '#1976D2',
  tileSatellite: '#1565C0',
  tileSpeed: '#7B1FA2',
  tileTemp: '#E65100',
  tileDepth: '#A67C3D',
  tileMode: '#0097A7',
  tileHeadlights: '#FFC107',
};

// For light theme (future use)
export const LightColors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
};
