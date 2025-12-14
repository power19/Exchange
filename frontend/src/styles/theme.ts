/**
 * Modern Dark Theme Configuration
 * Inspired by contemporary financial dashboards
 */

export const theme = {
  colors: {
    // Background colors
    background: {
      primary: '#0A0E27',
      secondary: '#151932',
      card: '#1a1f3a',
      cardHover: '#1f2547',
    },

    // Primary brand colors
    primary: {
      main: '#4DD0E1',      // Cyan - Main accent
      light: '#80DEEA',
      dark: '#00ACC1',
      gradient: 'linear-gradient(135deg, #4DD0E1 0%, #00ACC1 100%)',
    },

    // Category colors
    categories: {
      shopping: '#FF6B9D',
      platform: '#9C27B0',
      foodDrinks: '#FF9800',
      entertainment: '#4CAF50',
      business: '#2196F3',
      crypto: '#FFD700',
      transfer: '#00BCD4',
      withdrawal: '#F44336',
    },

    // Status colors
    status: {
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',
      pending: '#FFC107',
    },

    // Text colors
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B3C1',
      tertiary: '#6B7280',
      disabled: '#4B5563',
    },

    // Border colors
    border: {
      light: 'rgba(255, 255, 255, 0.1)',
      medium: 'rgba(255, 255, 255, 0.2)',
      strong: 'rgba(255, 255, 255, 0.3)',
    },
  },

  // Spacing scale (in rem)
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
  },

  // Border radius
  borderRadius: {
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    card: '0 4px 20px rgba(0, 0, 0, 0.25)',
    cardHover: '0 8px 30px rgba(0, 0, 0, 0.35)',
  },

  // Typography
  typography: {
    fontFamily: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, "Cascadia Code", "Liberation Mono", "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    base: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },

  // Z-index layers
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

export type Theme = typeof theme;
