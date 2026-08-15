import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ resend: vi.fn(), refetch: vi.fn(), isPending: false }));
const history = [
  { id: 1, notificationType: 'booking-cancelled', recipientEmail: 'alex@example.com', deliveryStatus: 'sent' as const, errorMessage: null, emailSubject: 'Your appointment has been cancelled', emailText: 'Hello Alex. Your appointment has been cancelled.', isManualResend: 'no' as const, createdAt: new Date() },
  { id: 2, notificationType: 'booking-confirmed', recipientEmail: 'alex@example.com', deliveryStatus: 'sent' as const, errorMessage: null, emailSubject: 'Booking confirmed', emailText: 'Hello Alex. Your visit is confirmed.', isManualResend: 'no' as const, createdAt: new Date() },
  { id: 3, notificationType: 'booking-rescheduled', recipientEmail: 'alex@example.com', deliveryStatus: 'sent' as const, errorMessage: null, isManualResend: 'no' as const, createdAt: new Date() },
  { id: 4, notificationType: 'booking-declined', recipientEmail: 'alex@example.com', deliveryStatus: 'sent' as const, errorMessage: null, isManualResend: 'no' as const, createdAt: new Date() },
  { id: 5, notificationType: 'booking-request', recipientEmail: 'alex@example.com', deliveryStatus: 'sent' as const, errorMessage: null, emailSubject: 'Booking request received', emailText: 'Hello Alex. I received your booking request.', isManualResend: 'no' as const, createdAt: new Date() },
  { id: 6, notificationType: 'appointment-reminder-120', recipientEmail: 'alex@example.com', deliveryStatus: 'failed' as const, errorMessage: '550 5.1.1 User unknown', emailSubject: 'Reminder: your visit is in 2 hours', emailText: 'Hello Alex. Your visit is in 2 hours.', isManualResend: 'no' as const, createdAt: new Date() },
];
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/trpc', () => ({ trpc: { admin: {
  clientEmailHistory: { useQuery: () => ({ data: history, isLoading: false, refetch: mocks.refetch }) },
  resendBookingNotification: { useMutation: () => ({ mutate: mocks.resend, isPending: mocks.isPending }) },
} } }));

import BookingEmailHistory from './BookingEmailHistory';

afterEach(cleanup);

describe('BookingEmailHistory', () => {
  it('shows delivery status and lets the admin resend the current notification', () => {
    render(<BookingEmailHistory bookingId={42} clientEmail="alex@example.com" language="ru" />);
    expect(screen.getByText('Запись отменена')).toBeTruthy();
    expect(screen.getAllByText('отправлено').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Повторить email' }));
    expect(mocks.resend).toHaveBeenCalledWith({ bookingId: 42 });
    expect(screen.queryByText('appointment-reminder-120')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Показать все (6)' }));
    expect(screen.getByText(/appointment-reminder-120/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ошибки' }));
    expect(screen.getByText(/Неверный или недоступный адрес/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Напоминания' }));
    expect(screen.getByText(/appointment-reminder-120/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Все' }));
    fireEvent.click(screen.getByText('Запись отменена'));
    expect(screen.getByText('Hello Alex. Your appointment has been cancelled.')).toBeTruthy();
  });

  it('opens saved previews for booking request, confirmation, and reminder entries', () => {
    render(<BookingEmailHistory bookingId={42} clientEmail="alex@example.com" language="ru" />);
    fireEvent.click(screen.getByText('Запись подтверждена'));
    expect(screen.getByText('Hello Alex. Your visit is confirmed.')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });

    fireEvent.click(screen.getByText('Заявка получена'));
    expect(screen.getByText('Hello Alex. I received your booking request.')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: 'Показать все (6)' }));
    fireEvent.click(screen.getByText(/appointment-reminder-120/));
    expect(screen.getByText('Hello Alex. Your visit is in 2 hours.')).toBeTruthy();
  });

  it('shows a clear loading state while a manual resend is in progress', () => {
    mocks.isPending = true;
    render(<BookingEmailHistory bookingId={42} clientEmail="alex@example.com" language="ru" />);
    expect(screen.getByRole('button', { name: 'Отправка...' })).toBeTruthy();
    mocks.isPending = false;
  });
});
