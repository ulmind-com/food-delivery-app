/**
 * 🎨 Food Delivery App — Design System
 * Exact match of the web frontend's Swiggy-inspired theme.
 * Colors extracted from index.css HSL variables → HEX.
 */

export const Colors = {
  light: {
    // Core
    primary: '#FC8019',           // Swiggy Orange (hsl 28 97% 54%)
    primaryLight: '#FFF3E0',      // Orange tint bg
    primaryForeground: '#FFFFFF',
    background: '#FFFFFF',
    card: '#FFFFFF',
    foreground: '#3D4152',        // Dark Slate (hsl 223 25% 27%)
    
    // Secondary
    secondary: '#FFF8E7',         // hsl 36 100% 95%
    secondaryForeground: '#3D4152',
    
    // Muted
    muted: '#F1F1F6',             // hsl 220 14% 96%
    mutedForeground: '#6B7280',   // hsl 220 9% 46%
    
    // Accent
    accent: '#FFF8E7',
    accentForeground: '#3D4152',
    
    // Borders
    border: '#E2E2E8',            // hsl 220 13% 91%
    inputBorder: '#E2E2E8',
    
    // Status
    success: '#22C55E',           // Veg Green (hsl 142 71% 45%)
    danger: '#DC2626',            // Non-Veg Red (hsl 0 84% 50%)
    destructive: '#EF4444',       // hsl 0 84% 60%
    warning: '#F59E0B',
    info: '#3B82F6',
    
    // Shadows
    shadowColor: '#000000',
    
    // Tab bar
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#FC8019',
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E2E2E8',
    
    // Misc
    overlay: 'rgba(0,0,0,0.5)',
    shimmerBase: '#F1F1F6',
    shimmerHighlight: '#E2E2E8',
    skeleton: '#F1F1F6',
  },
  dark: {
    // Core
    primary: '#FC8019',           // Same orange
    primaryLight: '#2A1A08',
    primaryForeground: '#FFFFFF',
    background: '#0F172A',        // hsl 224 30% 8% → deep navy
    card: '#1A2035',              // hsl 224 25% 12%
    foreground: '#E8ECF4',        // hsl 210 40% 95%
    
    // Secondary
    secondary: '#1F2A3E',         // hsl 224 20% 18%
    secondaryForeground: '#E8ECF4',
    
    // Muted
    muted: '#1F2A3E',
    mutedForeground: '#8B99B0',   // hsl 215 20% 65%
    
    // Accent
    accent: '#1F2A3E',
    accentForeground: '#E8ECF4',
    
    // Borders
    border: '#1F2A3E',
    inputBorder: '#2D3A52',
    
    // Status
    success: '#22C55E',
    danger: '#DC2626',
    destructive: '#7F1D1D',       // hsl 0 63% 31%
    warning: '#F59E0B',
    info: '#3B82F6',
    
    // Shadows
    shadowColor: '#000000',
    
    // Tab bar
    tabIconDefault: '#6B7280',
    tabIconSelected: '#FC8019',
    tabBarBackground: '#0F172A',
    tabBarBorder: '#1F2A3E',
    
    // Misc
    overlay: 'rgba(0,0,0,0.7)',
    shimmerBase: '#1F2A3E',
    shimmerHighlight: '#2D3A52',
    skeleton: '#1F2A3E',
  },
};

export type ThemeColors = typeof Colors.light;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const FontWeight = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

// Animation configs for Reanimated
export const AnimationConfig = {
  fadeIn: { duration: 400 },
  slideUp: { duration: 500 },
  spring: { damping: 20, stiffness: 300 },
  springBouncy: { damping: 12, stiffness: 200 },
  springSmooth: { damping: 30, stiffness: 300 },
} as const;
