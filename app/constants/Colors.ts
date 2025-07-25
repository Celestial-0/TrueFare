/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#2f95dc';
const tintColorDark = '#ffffff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Form colors
    error: '#ff4444',
    inputBackground: '#f8f9fa',
    inputBorder: '#11181C',
    disabledText: '#6c757d',
    // Button colors
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    secondary: '#6c757d',
    disabled: '#ccc',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    buttonText: '#FFFFFF',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // Form colors
    error: '#ff6b6b',
    inputBackground: '#2a2d30',
    inputBorder: '#ECEDEE',
    disabledText: '#6c757d',
    // Button colors
    success: '#51cf66',
    warning: '#ffd43b',
    danger: '#ff6b6b',
    secondary: '#6c757d',
    disabled: '#495057',
  },
};
