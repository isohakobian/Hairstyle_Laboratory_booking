import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ resend: vi.fn(), refetch: vi.fn() }));
const history = [
  { id: 1, notificationType: 'booking-cancelled', recipientEmail: 'alex@example.com', deliveryStatus: 'sent' as const, errorMessage: null, isManualResend: 'no' as const, createdAt: new Date() },
  { id: 2, notificationType: 'booking-confirmed', recipientEmail: 'alex@example.com', deliveryStatus: 'sent' as const, errorMessage: null, isManualResend: 'no' as const, createdAt: new Date() },
  { id: 3, notificationType: 'booking-rescheduled', recipientEmail: 'alex@example.com', deliveryStatus: 'sent' as const, errorMessage: null, isManualResend: 'no' as const, createdAt: new Date() },
  { id: 4, notificationType: 'booking-declined', recipientEmail: 'alex@example.com', deliveryStatus: 'sent' as const, errorMessage: null, isManualResend: 'no' as const, createdAt: new Date() },
  { id: 5, notificationType: 'booking-request', recipientEmail: 'alex@example.com', deliveryStatus: 'sent' as const, errorMessage: null, isManualResend: 'no' as const, createdAt: new Date() },
  { id: 6, notificationType: 'appointment-reminder-120', recipientEmail: 'alex@example.com', deliveryStatus: 'sent' as const, errorMessage: null, isManualResend: 'no' as const, createdAt: new Date() },
];
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/trpc', () => ({ trpc: { admin: {
  clientEmailHistory: { useQuery: () => ({ data: history, isLoading: false, refetch: mocks.refetch }) },
  resendBookingNotification: { useMutation: () => ({ mutate: mocks.resend, isPending: false }) },
} } }));

import BookingEmailHistory from './BookingEmailHistory';

describe('BookingEmailHistory', () => {
  it('shows delivery status and lets the admin resend the current notification', () => {
    render(<BookingEmailHistory bookingId={42} clientEmail="alex@example.com" language="ru" />);
    expect(screen.getByText('Запись отменена')).toBeTruthy();
    expect(screen.getAllByText('отправлено').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Повторить email' }));
    expect(mocks.resend).toHaveBeenCalledWith({ bookingId: 42 });
    expect(screen.queryByText('appointment-reminder-120')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Показать все (6)' }));
    expect(screen.getByText('appointment-reminder-120')).toBeTruthy();
  });
});
