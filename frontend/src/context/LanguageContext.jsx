import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('sme360_lang') || 'en';
  });

  const setLang = (newLang) => {
    if (translations[newLang]) {
      setLangState(newLang);
      localStorage.setItem('sme360_lang', newLang);
    }
  };

  const t = (key) => {
    const langDict = translations[lang] || translations.en;
    return langDict[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, supportedLanguages: ['en', 'si', 'ta'] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
