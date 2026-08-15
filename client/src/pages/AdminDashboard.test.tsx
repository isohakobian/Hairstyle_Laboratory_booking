import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const dashboardMockState = vi.hoisted(() => ({ showCancelledBooking: false }));

vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "ru" }) }));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "admin", name: "Isaac" }, isAuthenticated: true, logout: vi.fn(), loading: false }),
}));
vi.mock("wouter", () => ({ useLocation: () => ["/admin", vi.fn()] }));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("@/components/ScheduleCalendar", () => ({ default: () => <div>Schedule calendar</div> }));
vi.mock("@/components/BookingCalendar", () => ({ default: () => <div>Booking calendar</div> }));
vi.mock("@/components/BookingReminderSettingsEditor", () => ({ default: () => <div>Reminder settings editor</div> }));
vi.mock("@/components/BookingEmailHistory", () => ({ default: () => <div>Client email history</div> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      bookings: { useQuery: () => ({ data: [{ id: 1, status: "confirmed", clientName: "Alex", referenceNumber: "REF001", serviceName: "Haircut", serviceSummary: "Haircut", totalDurationMinutes: 45, totalPriceSummary: "15,000 ֏", bookingDate: "2099-12-30", bookingTime: "14:00", clientPhone: "+37455000000", clientEmail: "alex@example.com", comment: null, createdAt: new Date(), completedAt: new Date() }], isLoading: false, isError: false, refetch: vi.fn() }) },
      today: { useQuery: () => ({ data: { date: '2099-12-30', bookings: [{ id: 1, status: 'confirmed', clientName: 'Alex', bookingTime: '14:00' }], pendingCount: 0, confirmedCount: 1, freeWindows: [{ startTime: '09:00', endTime: '14:00' }] } }) },
      weeklyBookingStats: { useQuery: () => ({ data: { newBookings: 8, cancelledBookings: 2, pendingBookings: 1, confirmedBookings: 4, completedBookings: 6, emailDeliveryErrors: 1 } }) },
      bookingReminderSettings: { useQuery: () => ({ data: { firstOffsetMinutes: 1440, firstEnabled: 'yes', secondOffsetMinutes: 120, secondEnabled: 'yes' }, isLoading: false, refetch: vi.fn() }) },
      saveBookingReminderSettings: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      bookingPage: { useQuery: () => ({ data: { items: [{ id: 1, status: dashboardMockState.showCancelledBooking ? "cancelled" : "confirmed", clientName: "Alex", referenceNumber: "REF001", serviceName: "Haircut", serviceSummary: "Haircut", totalDurationMinutes: 45, totalPriceSummary: "15,000 ֏", bookingDate: "2099-12-30", bookingTime: "14:00", clientPhone: "+37455000000", clientEmail: "alex@example.com", comment: null, createdAt: new Date(), completedAt: dashboardMockState.showCancelledBooking ? null : new Date(), cancellationReason: dashboardMockState.showCancelledBooking ? "Plans changed" : null, hasEmailDeliveryFailure: true }], total: 30, page: 1, pageSize: 15 }, isLoading: false, isError: false }) },
      reviews: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      confirmBooking: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      declineBooking: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteBooking: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      requestReview: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      publishReview: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      rescheduleBooking: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      completeBooking: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updateManualDepositStatus: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      declineBookingForInvalidReceipt: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      batchResendEmailFailures: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      reviewRequests: { useQuery: () => ({ data: { items: [], stats: { sent: 0, received: 0, awaiting: 0 } }, isLoading: false, isError: false, refetch: vi.fn() }) },
      reviewRequestPage: { useQuery: () => ({ data: { items: [], total: 0, page: 1, pageSize: 15 }, isLoading: false, isError: false }) },
      reviewRequestStats: { useQuery: () => ({ data: { sent: 0, received: 0, awaiting: 0 } }) },
      reviewRequestTemplate: { useQuery: () => ({ data: { subjectRu: 'Спасибо за визит — Isaac', subjectEn: 'Thank you for your visit — Isaac', bodyRu: 'Привет, {{clientName}}', bodyEn: 'Hi, {{clientName}}' }, isLoading: false, refetch: vi.fn() }) },
      saveReviewRequestTemplate: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      clientDirectory: { useQuery: () => ({ data: [{ id: 7, name: 'Alex', phone: '+37455000000', email: 'alex@example.com', updatedAt: new Date() }], isLoading: false }) },
    },
    availability: {
      dates: { useQuery: () => ({ data: ["2099-12-30"] }) },
      slots: { useQuery: () => ({ data: ["14:00"] }) },
    },
    useUtils: () => ({
      admin: {
        bookingPage: { invalidate: vi.fn() },
        today: { invalidate: vi.fn() },
        weeklyBookingStats: { invalidate: vi.fn() },
        reviewRequestPage: { invalidate: vi.fn() },
        reviewRequestStats: { invalidate: vi.fn() },
      },
    }),
  },
}));

import AdminDashboard from "./AdminDashboard";

describe("AdminDashboard navigation", () => {
  it("groups bookings, calendar, availability, and reviews into reachable work sections", () => {
    render(<AdminDashboard />);

    expect(screen.getByText("Заявки клиентов")).toBeTruthy();
    expect(screen.getByText(/Сегодня · 2099-12-30/)).toBeTruthy();
    expect(screen.getByText("Недельная динамика")).toBeTruthy();
    expect(screen.getByText("Последние 7 дней")).toBeTruthy();
    expect(screen.getByText("Ошибки email")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Повторить ошибки email" })).toBeTruthy();
    expect(screen.getByText("Client email history")).toBeTruthy();
    expect(screen.getByText("Ошибка email")).toBeTruthy();
    expect(screen.getByText("Отправить запрос на отзыв")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Календарь/i }));
    expect(screen.getByText("Календарь клиентов")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Доступность/i }));
    expect(screen.getByText("Доступность для записи")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Отзывы/i }));
    expect(screen.getByText("Отзывы клиентов")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Клиенты/i }));
    const clientSearch = screen.getByPlaceholderText("Имя, телефон или email");
    fireEvent.change(clientSearch, { target: { value: "Alex" } });
    expect(screen.getByText("Alex")).toBeTruthy();
    fireEvent.change(clientSearch, { target: { value: "+37455000000" } });
    expect(screen.getByText("Alex")).toBeTruthy();
    fireEvent.change(clientSearch, { target: { value: "alex@example.com" } });
    expect(screen.getByText("Alex")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Настройки/i }));
    expect(screen.getByText("Reminder settings editor")).toBeTruthy();
  });

  it("changes the visible booking page through accessible pagination controls", () => {
    window.history.replaceState(null, '', '/admin');
    const { container } = render(<AdminDashboard />);
    const summary = () => container.querySelector('[data-testid="booking-page-summary"]')?.textContent;
    const nextPage = container.querySelector('a[aria-label="Следующая страница заявок"]');

    expect(summary()).toContain("Страница 1 из 2 · всего 30");
    expect(nextPage).not.toBeNull();
    if (!nextPage) throw new Error('Next-page control was not rendered');
    fireEvent.click(nextPage);
    expect(summary()).toContain("Страница 2 из 2 · всего 30");
  });

  it("shows a client cancellation reason on the cancelled booking card", () => {
    dashboardMockState.showCancelledBooking = true;
    render(<AdminDashboard />);

    expect(screen.getByText("Причина отмены:")).toBeTruthy();
    expect(screen.getByText("Plans changed")).toBeTruthy();
    dashboardMockState.showCancelledBooking = false;
  });
});
