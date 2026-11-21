import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ language: "en" }),
}));

import AddToHomeScreen from "./AddToHomeScreen";

describe("AddToHomeScreen", () => {
  it("shows native instructions for both iPhone and Android", () => {
    render(<AddToHomeScreen />);
    expect(screen.getByText("Save the site to your home screen")).toBeTruthy();
    expect(screen.getByText("In Safari, tap the Share button at the bottom, choose Add to Home Screen, then tap Add.")).toBeTruthy();
    expect(screen.getByText("In Chrome, tap ⋮ in the top-right corner, choose Add to Home screen or Install app.")).toBeTruthy();
    expect(screen.getAllByText("Tap Share").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open the ⋮ menu").length).toBeGreaterThan(0);
  });

  it("opens the visual guide automatically for a new visitor", () => {
    localStorage.removeItem("hl_add_to_home_seen");
    vi.useFakeTimers();
    render(<AddToHomeScreen autoPopup />);
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => { vi.advanceTimersByTime(2800); });
    expect(screen.getByRole("dialog")).toBeTruthy();
    vi.useRealTimers();
  });

  it("shows again after seven days when the visitor dismissed it", () => {
    localStorage.removeItem("hl_add_to_home_seen");
    vi.useFakeTimers();
    const firstVisit = render(<AddToHomeScreen autoPopup />);
    act(() => { vi.advanceTimersByTime(2800); });
    fireEvent.click(within(firstVisit.container).getByRole("button", { name: "Maybe later" }));
    expect(Number(localStorage.getItem("hl_add_to_home_seen"))).toBeGreaterThan(0);
    firstVisit.unmount();

    const sameWeekVisit = render(<AddToHomeScreen autoPopup />);
    act(() => { vi.advanceTimersByTime(2800); });
    expect(within(sameWeekVisit.container).queryByRole("dialog")).toBeNull();
    sameWeekVisit.unmount();

    localStorage.setItem("hl_add_to_home_seen", String(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1));
    const nextWeekVisit = render(<AddToHomeScreen autoPopup />);
    act(() => { vi.advanceTimersByTime(2800); });
    expect(within(nextWeekVisit.container).getByRole("dialog")).toBeTruthy();
    nextWeekVisit.unmount();
    vi.useRealTimers();
  });
});
