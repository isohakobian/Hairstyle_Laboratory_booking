import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const clientMemory = {
  profile: { id: 7, name: 'Alex', phone: '+37455000000', email: 'alex@example.com', birthday: null, instagram: null, preferredHairLength: null, preferredBeardShape: null, preferredStyling: null, dislikes: null, skinSensitivity: null, stylistNotes: null },
  metrics: { completedVisitCount: 0, totalSpentAmd: 0, averageCheckAmd: 0, popularServices: [], lastVisit: null, daysSinceLastVisit: null },
  visits: [{ id: 11, bookingDate: '2099-12-30', bookingTime: '14:00', status: 'cancelled', serviceName: 'Haircut', serviceSummary: 'Haircut', totalDurationMinutes: 45, totalPriceSummary: '15,000 ֏', finalPriceAmd: null, completedAt: null, repeatFollowUpSentAt: null, serviceIds: [1] }],
  events: [{ id: 4, bookingId: 11, eventType: 'cancelled', note: 'Plans changed', createdAt: new Date() }],
  media: [],
  reviewRequests: [],
};

vi.mock('wouter', () => ({ useLocation: () => ['/admin', vi.fn()] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    admin: {
      clientMemory: { useQuery: () => ({ data: clientMemory, isLoading: false, refetch: vi.fn() }) },
      clientCrmPreference: { useQuery: () => ({ data: { newsletterConsented: 'no' }, refetch: vi.fn() }) },
      saveClientCrmPreference: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updateClientMemory: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      uploadVisitMedia: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      visitMediaUrl: { useQuery: () => ({ data: null }) },
    },
  },
}));

import ClientMemoryPanel from './ClientMemoryPanel';

describe('ClientMemoryPanel cancellation history', () => {
  it('shows a client cancellation and its reason in the visit timeline', () => {
    render(<ClientMemoryPanel clientId={7} language="ru" onClose={vi.fn()} />);

    expect(screen.getByText('Отменён клиентом')).toBeTruthy();
    expect(screen.getByText('Отмена клиентом')).toBeTruthy();
    expect(screen.getByText('Plans changed')).toBeTruthy();
  });
});
