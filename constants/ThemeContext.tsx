import React, { createContext, useContext } from 'react';
import { Colors, type ThemeColors } from './theme';

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: Colors.light,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Orange + White theme — no dark mode
  const colors = Colors.light;
  return (
    <ThemeContext.Provider value={{ isDark: false, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export { Colors };
