// Theme configuration for the modernized UI
import { DefaultTheme } from 'react-native-paper';

// Color palette
const colors = {
  primary: '#7C4DFF', // Purple primary color
  primaryDark: '#5E35B1',
  primaryLight: '#B39DDB',
  accent: '#FF4081', // Pink accent color
  background: '#F8F9FE',
  surface: '#FFFFFF',
  error: '#EF5350',
  text: '#2D3748',
  textSecondary: '#718096',
  border: '#E2E8F0',
  disabled: '#A0AEC0',
  placeholder: '#A0AEC0',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#FF4081',
  success: '#48BB78',
  warning: '#F6AD55',
};

// Paper theme 
export const theme = {
  ...DefaultTheme,
  roundness: 10,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    accent: colors.accent,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
    text: colors.text,
    disabled: colors.disabled,
    placeholder: colors.placeholder,
    backdrop: colors.backdrop,
    notification: colors.notification,
  },
};

// Custom theme elements
export const customTheme = {
  colors,
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    s: 5,
    m: 10,
    l: 15,
    xl: 20,
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    fontSize: {
      xs: 12,
      s: 14,
      m: 16,
      l: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
  },
  elevation: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
  }
};
