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
    expect(screen.getByText("Open the site in Safari → tap Share → Add to Home Screen → Add.")).toBeTruthy();
    expect(screen.getByText("Open the site in Chrome → tap ⋮ → Add to Home screen or Install app.")).toBeTruthy();
  });
});
