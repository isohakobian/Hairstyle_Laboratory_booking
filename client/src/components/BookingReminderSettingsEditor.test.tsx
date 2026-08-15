import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ save: vi.fn(), refetch: vi.fn() }));
const reminderSettings = { firstOffsetMinutes: 1440, firstEnabled: 'yes' as const, secondOffsetMinutes: 120, secondEnabled: 'yes' as const };

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    admin: {
      bookingReminderSettings: { useQuery: () => ({ data: reminderSettings, isLoading: false, refetch: mocks.refetch }) },
      saveBookingReminderSettings: { useMutation: () => ({ mutate: mocks.save, isPending: false }) },
    },
  },
}));

import BookingReminderSettingsEditor from './BookingReminderSettingsEditor';

describe('BookingReminderSettingsEditor', () => {
  it('allows the owner to adjust and disable the second reminder', () => {
    render(<BookingReminderSettingsEditor language="ru" />);

    const offsets = screen.getAllByRole('spinbutton');
    fireEvent.change(offsets[1], { target: { value: '90' } });
    const toggles = screen.getAllByRole('checkbox');
    fireEvent.click(toggles[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить время напоминаний' }));

    expect(mocks.save).toHaveBeenCalledWith({ firstOffsetMinutes: 1440, firstEnabled: 'yes', secondOffsetMinutes: 90, secondEnabled: 'no' });
  });
});
