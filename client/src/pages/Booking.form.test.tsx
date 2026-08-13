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

  it("submits the client email from the visible form to the booking mutation", async () => {
    const { container } = render(<Booking />);

    fireEvent.click(screen.getByRole("button", { name: /Стрижка/i }));
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: "2099-12-30" } });
    fireEvent.change(container.querySelector("select")!, { target: { value: "14:00" } });
    fireEvent.change(container.querySelector('input[type="text"]')!, { target: { value: "Client Name" } });
    fireEvent.change(container.querySelector('input[type="tel"]')!, { target: { value: "+37455000000" } });
    fireEvent.change(container.querySelector('input[type="email"]')!, { target: { value: "CLIENT@EXAMPLE.COM" } });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        serviceId: 1,
        serviceName: "Стрижка",
        clientEmail: "client@example.com",
        clientName: "Client Name",
        clientPhone: "+37455000000",
      }));
    });
  });
});
