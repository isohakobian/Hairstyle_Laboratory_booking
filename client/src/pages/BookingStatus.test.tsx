import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const cancelMutate = vi.fn((_input: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.());
const refetch = vi.fn().mockResolvedValue(undefined);

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'ru' }) }));
vi.mock('wouter', () => ({ useLocation: () => ['/status?ref=BOOKING1', vi.fn()] }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    bookings: {
      getByReference: { useQuery: () => ({ data: { referenceNumber: 'BOOKING1', status: 'confirmed', serviceName: 'Haircut', bookingDate: '2099-12-30', bookingTime: '14:00', clientName: 'Alex' }, isLoading: false, refetch }) },
      requestStatusRecovery: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      recoverStatus: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      cancelByClient: { useMutation: () => ({ mutate: cancelMutate, isPending: false, isError: false }) },
    },
  },
}));

import BookingStatus from './BookingStatus';

describe('BookingStatus cancellation', () => {
  it('submits the client email and cancellation reason for the current booking', () => {
    render(<BookingStatus />);
    fireEvent.click(screen.getByRole('button', { name: 'Отменить запись' }));
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByLabelText('Причина отмены'), { target: { value: 'Изменились планы' } });
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить отмену' }));

    expect(cancelMutate).toHaveBeenCalledWith({ referenceNumber: 'BOOKING1', clientEmail: 'alex@example.com', reason: 'Изменились планы' }, expect.any(Object));
    expect(refetch).toHaveBeenCalled();
    expect(screen.getByText('Запись отменена. Спасибо, что предупредили.')).toBeTruthy();
  });
});
