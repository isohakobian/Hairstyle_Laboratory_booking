import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'ru', setLanguage: vi.fn() }) }));
vi.mock('@/_core/hooks/useAuth', () => ({ useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }) }));
vi.mock('@/const', () => ({ getLoginUrl: () => '/login' }));
vi.mock('wouter', () => ({ useLocation: () => ['/', vi.fn()] }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    announcements: { active: { useQuery: () => ({ data: null }) } },
    services: { list: { useQuery: () => ({
      data: [
        { id: 11, nameRu: 'Первая услуга', nameEn: 'First service', descriptionRu: 'Первая в порядке', descriptionEn: 'First in order', durationMinutes: 30, priceAmd: 12000, priceMinAmd: null, priceMaxAmd: null, depositAmd: null },
        { id: 12, nameRu: 'Вторая услуга', nameEn: 'Second service', descriptionRu: 'Цена диапазоном', descriptionEn: 'Range price', durationMinutes: 90, priceAmd: null, priceMinAmd: 30000, priceMaxAmd: 45000, depositAmd: 10000 },
      ],
      isLoading: false, isError: false,
    }) } },
  },
}));

import Home from './Home';

describe('Home service catalog', () => {
  it('renders live catalog services in the API order with AMD pricing and deposits', () => {
    const { container } = render(<Home />);
    expect(screen.getByText('Первая услуга')).toBeTruthy();
    expect(screen.getByText('Вторая услуга')).toBeTruthy();
    expect(screen.getByText('12,000 ֏')).toBeTruthy();
    expect(screen.getByText('30,000 – 45,000 ֏')).toBeTruthy();
    expect(screen.getByText('Предоплата: 10,000 ֏')).toBeTruthy();
    const text = container.textContent ?? '';
    expect(text.indexOf('Первая услуга')).toBeLessThan(text.indexOf('Вторая услуга'));
  });
});
