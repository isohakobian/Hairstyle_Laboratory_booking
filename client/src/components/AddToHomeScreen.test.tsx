import React from "react";
import { render, screen } from "@testing-library/react";
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
});
