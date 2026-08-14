import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "ru" }) }));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "admin", name: "Isaac" }, isAuthenticated: true, logout: vi.fn(), loading: false }),
}));
vi.mock("wouter", () => ({ useLocation: () => ["/admin", vi.fn()] }));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("@/components/ScheduleCalendar", () => ({ default: () => <div>Schedule calendar</div> }));
vi.mock("@/components/BookingCalendar", () => ({ default: () => <div>Booking calendar</div> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      bookings: { useQuery: () => ({ data: [{ id: 1, status: "confirmed", clientName: "Alex", referenceNumber: "REF001", serviceName: "Haircut", serviceSummary: "Haircut", totalDurationMinutes: 45, totalPriceSummary: "15,000 ֏", bookingDate: "2099-12-30", bookingTime: "14:00", clientPhone: "+37455000000", clientEmail: "alex@example.com", comment: null, createdAt: new Date(), completedAt: new Date() }], isLoading: false, isError: false, refetch: vi.fn() }) },
      reviews: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      confirmBooking: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      declineBooking: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteBooking: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      requestReview: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      publishReview: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      rescheduleBooking: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      completeBooking: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      reviewRequests: { useQuery: () => ({ data: { items: [], stats: { sent: 0, received: 0, awaiting: 0 } }, isLoading: false, isError: false, refetch: vi.fn() }) },
    },
    availability: {
      dates: { useQuery: () => ({ data: ["2099-12-30"] }) },
      slots: { useQuery: () => ({ data: ["14:00"] }) },
    },
  },
}));

import AdminDashboard from "./AdminDashboard";

describe("AdminDashboard navigation", () => {
  it("groups bookings, calendar, availability, and reviews into reachable work sections", () => {
    render(<AdminDashboard />);

    expect(screen.getByText("Заявки клиентов")).toBeTruthy();
    expect(screen.getByText("Отправить запрос на отзыв")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Календарь/i }));
    expect(screen.getByText("Календарь клиентов")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Доступность/i }));
    expect(screen.getByText("Доступность для записи")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Отзывы/i }));
    expect(screen.getByText("Отзывы клиентов")).toBeTruthy();
  });
});
