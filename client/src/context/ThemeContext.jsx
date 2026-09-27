import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

/**
 * ThemeProvider — wraps the whole app.
 * Reads from localStorage on mount, applies "dark" class to <html>,
 * and persists the choice on every toggle.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Initialise from localStorage; default to dark (data-center aesthetic)
    return localStorage.getItem('smartdc-theme') || 'dark';
  });

  // Apply/remove the "dark" class on <html> whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('smartdc-theme', theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Hook — use anywhere inside ThemeProvider */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
