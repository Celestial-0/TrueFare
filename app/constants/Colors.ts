/**
 * A refined and cohesive color palette for the application.
 * This structure standardizes color names and uses a neutral color scale
 * for better consistency and a more professional look across light and dark modes.
 */

// A vibrant, accessible blue is used as the primary accent color.
const primaryLight = '#007AFF';
const primaryDark = '#0A84FF';

// A secondary accent color for variety in UI elements.
const accentLight = '#FF9500'; // Using the 'warning' color as an accent
const accentDark = '#FF9F0A';

// A consistent grayscale provides a solid foundation for all neutral UI elements.
const neutrals = {
  // Light Mode
  white: '#FFFFFF',
  gray100: '#F8F9FA', // Lighter background/input
  gray200: '#E9ECEF', // Borders, dividers, disabled bg
  gray500: '#ADB5BD', // Icons, disabled text
  gray700: '#495057', // Secondary text
  gray900: '#212529', // Primary text

  // Dark Mode
  black: '#000000',
  gray800: '#1C1C1E', // App background
  gray700_dark: '#2C2C2E', // Card, input background
  gray500_dark: '#8E8E93', // Borders, dividers, icons
  gray300_dark: '#AEAEB2', // Secondary text
  gray100_dark: '#F2F2F7', // Primary text
};

export const Colors = {
  light: {
    // --- Core Palette ---
    primary: primaryLight,
    accent: accentLight, // ADDED: For secondary actions or highlights
    text: neutrals.gray900,
    textSecondary: neutrals.gray700,
    background: neutrals.white,
    card: neutrals.gray100,
    border: neutrals.gray200,
    icon: neutrals.gray500,
    tint: primaryLight,
    shadow: neutrals.gray900, // ADDED: Shadow color for light mode

    // --- Semantic Palette ---
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    successBackground: 'rgba(52, 199, 89, 0.1)',

    // --- Component-Specific ---
    tabIconDefault: neutrals.gray500,
    tabIconSelected: primaryLight,
    inputBackground: neutrals.white,
    inputBorder: neutrals.gray200,
    disabledBackground: neutrals.gray200,
    disabledText: neutrals.gray500,
    secondary: neutrals.gray700,
    primaryButtonText: neutrals.white,
    secondaryButtonText: neutrals.white,
    dangerButtonText: neutrals.white,
  },
  dark: {
    // --- Core Palette ---
    primary: primaryDark,
    accent: accentDark, // ADDED: For secondary actions or highlights
    text: neutrals.gray100_dark,
    textSecondary: neutrals.gray300_dark,
    background: neutrals.black,
    card: neutrals.gray800,
    border: neutrals.gray700_dark,
    icon: neutrals.gray500_dark,
    tint: primaryDark,
    shadow: neutrals.black, // ADDED: Shadow color for dark mode

    // --- Semantic Palette ---
    success: '#30D158',
    warning: '#FF9F0A',
    danger: '#FF453A',
    successBackground: 'rgba(48, 209, 88, 0.15)',

    // --- Component-Specific ---
    tabIconDefault: neutrals.gray500_dark,
    tabIconSelected: primaryDark,
    inputBackground: neutrals.gray700_dark,
    inputBorder: neutrals.gray500_dark,
    disabledBackground: neutrals.gray700_dark,
    disabledText: neutrals.gray500_dark,
    secondary: neutrals.gray500_dark,
    primaryButtonText: neutrals.white,
    secondaryButtonText: neutrals.gray100_dark,
    dangerButtonText: neutrals.white,
  },
};
