import React, { createContext, useContext, useState, useEffect } from 'react';

// Scalable language type — add new languages here only
export type Language = 'hy' | 'ru' | 'en';
// Future: | 'am' | 'ar' | 'es' | 'fr'

export const SUPPORTED_LANGUAGES: Language[] = ['hy', 'ru', 'en'];
export const DEFAULT_LANGUAGE: Language = 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function isValidLanguage(lang: string | null): lang is Language {
  return SUPPORTED_LANGUAGES.includes(lang as Language);
}

function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
  if (locales.some((locale) => locale.toLowerCase().startsWith('hy'))) return 'hy';
  if (locales.some((locale) => locale.toLowerCase().startsWith('en'))) return 'en';
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
    try {
      const saved = localStorage.getItem('hl_language');
      return isValidLanguage(saved) ? saved : detectBrowserLanguage();
    } catch {
      return detectBrowserLanguage();
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hl_language');
      if (isValidLanguage(saved)) {
        setLanguageState(saved);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('hl_language', lang);
    } catch {
      // localStorage not available
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
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
