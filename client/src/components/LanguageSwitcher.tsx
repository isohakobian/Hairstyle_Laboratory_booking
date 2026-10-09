import React from 'react';
import { useLanguage, SUPPORTED_LANGUAGES, type Language } from '@/contexts/LanguageContext';

const labels: Record<Language, string> = {
  hy: 'HY',
  ru: 'RU',
  en: 'EN',
};

const names: Record<Language, string> = {
  hy: 'Հայերեն',
  ru: 'Русский',
  en: 'English',
};

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language / Լեզու"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.125rem',
        border: '1px solid hsl(var(--border))',
        padding: '0.125rem',
      }}
    >
      {SUPPORTED_LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          aria-label={names[option]}
          aria-pressed={language === option}
          style={{
            minWidth: '2.25rem',
            minHeight: '2rem',
            padding: '0.375rem 0.45rem',
            background: language === option ? 'hsl(var(--secondary))' : 'transparent',
            border: 'none',
            color: language === option ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.625rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}
