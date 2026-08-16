import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  blockedDates: [{ date: '2026-08-20', reason: 'Day off' }],
  windows: [] as Array<{ date: string; startTime: string; endTime: string; slotIntervalMinutes: number }>,
  clearAvailability: vi.fn(),
  refetchBlocked: vi.fn(),
  refetchWindows: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    admin: {
      blockedDates: { useQuery: () => ({ data: mocks.blockedDates, refetch: mocks.refetchBlocked }) },
      availabilityWindows: { useQuery: () => ({ data: mocks.windows, refetch: mocks.refetchWindows }) },
      setAvailability: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      blockDates: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      clearAvailability: { useMutation: (options: { onSuccess?: () => void }) => ({
        mutate: (input: { dates: string[] }) => {
          mocks.clearAvailability(input);
          mocks.blockedDates = [];
          mocks.windows = [];
          options.onSuccess?.();
        },
        isPending: false,
      }) },
    },
  },
}));

import ScheduleCalendar from './ScheduleCalendar';

afterEach(() => {
  mocks.blockedDates = [{ date: '2026-08-20', reason: 'Day off' }];
  mocks.windows = [];
  mocks.clearAvailability.mockClear();
  vi.useRealTimers();
});

describe('ScheduleCalendar', () => {
  it('returns a closed selected day to a neutral state and removes its manual slots', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1, 12, 0, 0));
    const { rerender } = render(<ScheduleCalendar language="ru" />);

    fireEvent.click(screen.getByTitle('Закрыт'));
    fireEvent.click(screen.getByRole('button', { name: 'Снять статус и слоты' }));

    expect(mocks.clearAvailability).toHaveBeenCalledWith({ dates: ['2026-08-20'] });
    rerender(<ScheduleCalendar language="ru" />);
    expect(screen.queryByTitle('Закрыт')).toBeNull();
    expect(screen.getAllByTitle('Не открыт').length).toBeGreaterThan(0);
  });
});
