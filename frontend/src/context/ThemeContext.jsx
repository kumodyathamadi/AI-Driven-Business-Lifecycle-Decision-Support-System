import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('sme360_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const applyThemeToDom = (targetTheme) => {
    const isDark = targetTheme === 'dark';
    try {
      document.documentElement.setAttribute('data-theme', targetTheme);
      document.body.setAttribute('data-theme', targetTheme);
      document.documentElement.style.colorScheme = targetTheme;

      if (isDark) {
        document.documentElement.classList.remove('theme-light', 'light');
        document.documentElement.classList.add('theme-dark', 'dark');
        document.body.classList.remove('theme-light', 'light');
        document.body.classList.add('theme-dark', 'dark');
      } else {
        document.documentElement.classList.remove('theme-dark', 'dark');
        document.documentElement.classList.add('theme-light', 'light');
        document.body.classList.remove('theme-dark', 'dark');
        document.body.classList.add('theme-light', 'light');
      }

      localStorage.setItem('sme360_theme', targetTheme);
    } catch (e) {
      console.warn('Error applying theme to DOM:', e);
    }
  };

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const setDarkMode = () => {
    applyThemeToDom('dark');
    setTheme('dark');
  };

  const setLightMode = () => {
    applyThemeToDom('light');
    setTheme('light');
  };

  const toggleTheme = () => {
    const currentDom = document.documentElement.getAttribute('data-theme');
    const nextTheme = (currentDom === 'dark' || theme === 'dark') ? 'light' : 'dark';
    applyThemeToDom(nextTheme);
    setTheme(nextTheme);
  };

  const isDarkMode = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, setDarkMode, setLightMode, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'dark',
      setTheme: () => { },
      toggleTheme: () => { },
      setDarkMode: () => { },
      setLightMode: () => { },
      isDarkMode: true,
    };
  }
  return context;
};

