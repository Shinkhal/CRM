/**
 * Centralized Design System Constants
 * Use this file for components that need programmatic access to theme tokens.
 */

export const THEME = {
  // Font Definitions
  fonts: {
    main: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    heading: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  },

  // Color Palette (Minimalist Tactile Light Theme)
  colors: {
    canvas: '#F6F7FA',
    card: '#FFFFFF',
    elevated: '#FAFBFD',
    well: '#EEF1F6',
    wellSubtle: '#F4F6F9',

    // Ink
    ink: {
      primary: '#111827',
      secondary: '#4B5563',
      muted: '#6B7280',
      dim: '#9CA3AF',
      divider: '#E2E6EE',
    },

    // Borders
    border: {
      base: '#E2E6EE',
      strong: '#CBD2DF',
      subtle: '#EDF0F5',
    },

    // Accents
    accent: {
      carbon: '#181E29',
      slate: '#334155',
      cobalt: '#2563EB',
      emerald: '#059669',
      amber: '#D97706',
      rose: '#E11D48',
    },
  },

  // Skeuomorphic shadow constants
  shadows: {
    plate: '0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px -4px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1)',
    well: 'inset 0 2px 4px rgba(15, 23, 42, 0.06), inset 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 0 rgba(255, 255, 255, 0.8)',
    button: '0 1px 2px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.03), inset 0 1px 0 rgba(255, 255, 255, 1)',
    buttonDark: '0 2px 4px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  },
};

export default THEME;
