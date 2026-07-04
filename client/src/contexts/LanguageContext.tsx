import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Language } from '@shared/i18n';
import { t } from '@shared/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof import('@shared/i18n').translations.en) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Initialize with default value
    if (typeof window === 'undefined') return 'en';
    try {
      const saved = localStorage.getItem('language') as Language | null;
      return (saved === 'ru' || saved === 'en') ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    // Sync with localStorage after mount
    try {
      const saved = localStorage.getItem('language') as Language | null;
      if (saved === 'ru' || saved === 'en') {
        setLanguageState(saved);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('language', lang);
    } catch {
      // localStorage not available
    }
  };

  const translate = (key: keyof typeof import('@shared/i18n').translations.en) => {
    return t(key, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
