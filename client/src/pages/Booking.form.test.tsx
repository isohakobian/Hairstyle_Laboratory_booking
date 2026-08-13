import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mutateAsync } = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue({ referenceNumber: "BOOKING1" }),
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
            { id: 150001, nameEn: "Haircut", durationMinutes: 45, priceAmd: 15000, priceMinAmd: null, priceMaxAmd: null, depositAmd: null },
            { id: 150002, nameEn: "Beard Modeling", durationMinutes: 30, priceAmd: 12000, priceMinAmd: null, priceMaxAmd: null, depositAmd: null },
            { id: 150003, nameEn: "Bio Perm", durationMinutes: 180, priceAmd: null, priceMinAmd: 70000, priceMaxAmd: 110000, depositAmd: 35000 },
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
  });

  it("submits distinct selected services and the client email from the visible form", async () => {
    const { container } = render(<Booking />);

    fireEvent.click(screen.getByRole("button", { name: /Стрижка/i }));
    fireEvent.click(screen.getByRole("button", { name: /Моделирование бороды/i }));
    expect(screen.getByText('75 мин')).toBeTruthy();
    expect(screen.getByText('27,000 ֏')).toBeTruthy();
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: "2099-12-30" } });
    fireEvent.change(container.querySelector("select")!, { target: { value: "14:00" } });
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
});
