import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mutateAsync, slotsUseQuery } = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue({ referenceNumber: "BOOKING1" }),
  slotsUseQuery: vi.fn(),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ language: "ru" }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    services: {
      list: {
        useQuery: () => ({
          data: [
            { id: 150002, nameRu: "Моделирование бороды", nameEn: "Beard Modeling", durationMinutes: 30, priceAmd: 12000, priceMinAmd: null, priceMaxAmd: null, depositAmd: null },
            { id: 150001, nameRu: "Стрижка", nameEn: "Haircut", durationMinutes: 45, priceAmd: 15000, priceMinAmd: null, priceMaxAmd: null, depositAmd: null },
          ],
          isLoading: false,
        }),
      },
    },
    bookings: {
      create: {
        useMutation: () => ({ mutateAsync, isPending: false }),
      },
    },
    availability: {
      dates: {
        useQuery: () => ({ data: ["2099-12-30"], isLoading: false }),
      },
      slots: {
        useQuery: (...args: unknown[]) => {
          slotsUseQuery(...args);
          return { data: ["14:00"], isLoading: false };
        },
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/booking", vi.fn()],
}));

import Booking from "./Booking";

describe("Booking form", () => {
  afterEach(() => {
    cleanup();
    mutateAsync.mockClear();
    slotsUseQuery.mockClear();
    window.sessionStorage.clear();
  });

  it("submits distinct selected services and the client email from the visible form", async () => {
    const { container } = render(<Booking />);

    const catalogText = container.textContent ?? "";
    expect(catalogText.indexOf("Моделирование бороды")).toBeLessThan(catalogText.indexOf("Стрижка"));
    expect(screen.queryByRole("button", { name: /Bio Perm|Биохимическая завивка/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Стрижка/i }));
    fireEvent.click(screen.getByRole("button", { name: /Моделирование бороды/i }));
    expect(screen.getByText('75 мин')).toBeTruthy();
    expect(screen.getByText('27,000 ֏')).toBeTruthy();
    const selects = container.querySelectorAll("select");
    fireEvent.change(selects[0]!, { target: { value: "2099-12-30" } });
    fireEvent.change(selects[1]!, { target: { value: "14:00" } });
    fireEvent.change(container.querySelector('input[type="text"]')!, { target: { value: "Client Name" } });
    fireEvent.change(container.querySelector('input[type="tel"]')!, { target: { value: "+37455000000" } });
    fireEvent.change(container.querySelector('input[type="email"]')!, { target: { value: "CLIENT@EXAMPLE.COM" } });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        serviceIds: [150001, 150002],
        clientEmail: "client@example.com",
        clientName: "Client Name",
        clientPhone: "+37455000000",
      }));
    });
  });

  it('uses a one-time private repeat-booking draft to prefill past services and client details', () => {
    window.sessionStorage.setItem('hairstyle-laboratory.repeat-booking-draft', JSON.stringify({
      serviceIds: [150001, 150002],
      clientName: 'Repeat Client',
      clientPhone: '+37455000123',
      clientEmail: 'repeat@example.com',
      clientBirthday: '1990-03-14',
      clientInstagram: 'repeat.client',
    }));

    const { container } = render(<Booking />);

    expect(screen.getByText('Повторная запись: данные клиента и прошлые услуги подставлены. Проверьте их и выберите дату и время.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Стрижка/i }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Моделирование бороды/i }).getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('input[type="text"]')?.getAttribute('value')).toBe('Repeat Client');
    expect(container.querySelector('input[type="tel"]')?.getAttribute('value')).toBe('+37455000123');
    expect(container.querySelector('input[type="email"]')?.getAttribute('value')).toBe('repeat@example.com');
    expect(window.sessionStorage.getItem('hairstyle-laboratory.repeat-booking-draft')).toBeNull();

    const selects = container.querySelectorAll('select');
    fireEvent.change(selects[0]!, { target: { value: '2099-12-30' } });
    expect(slotsUseQuery).toHaveBeenLastCalledWith(
      { date: '2099-12-30', durationMinutes: 75 },
      expect.objectContaining({ enabled: true }),
    );
  });
});
