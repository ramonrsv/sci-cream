import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock CSS import — Vite's CSS plugin tries to run PostCSS before vi.mock can intercept,
// so we need to stub the module at the Vite level via this vi.mock (hoisted before imports).
vi.mock("./globals.css", () => ({ default: {} }));

// Mock dependencies used by layout.tsx
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

vi.mock("@/lib/web-vitals", () => ({ WebVitals: () => <div data-testid="web-vitals" /> }));

vi.mock("@vercel/analytics/next", () => ({ Analytics: () => <div data-testid="analytics" /> }));

vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => <div data-testid="speed-insights" />,
}));

vi.mock("@/lib/ui/navbar", () => ({
  Navbar: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { default: RootLayout, metadata } = await import("./layout");

// ---------------------------------------------------------------------------
// RootLayout
// ---------------------------------------------------------------------------

describe("RootLayout", () => {
  it("renders children inside the body", () => {
    render(
      <RootLayout>
        <h1>Ice Cream Calculator</h1>
      </RootLayout>,
      // RootLayout renders <html> and <body>, so we target the document itself
      { container: document },
    );

    expect(screen.getByRole("heading", { name: "Ice Cream Calculator" })).toBeInTheDocument();
  });

  it("includes WebVitals, Analytics, and SpeedInsights", () => {
    render(
      <RootLayout>
        <div />
      </RootLayout>,
      { container: document },
    );

    expect(screen.getByTestId("web-vitals")).toBeInTheDocument();
    expect(screen.getByTestId("analytics")).toBeInTheDocument();
    expect(screen.getByTestId("speed-insights")).toBeInTheDocument();
  });

  it("sets lang=en on the html element", () => {
    render(
      <RootLayout>
        <div />
      </RootLayout>,
      { container: document },
    );

    expect(document.documentElement.lang).toBe("en");
  });

  it("applies font variables and antialiased class to the body", () => {
    render(
      <RootLayout>
        <div />
      </RootLayout>,
      { container: document },
    );

    const body = document.body;
    expect(body.className).toContain("--font-geist-sans");
    expect(body.className).toContain("--font-geist-mono");
    expect(body.className).toContain("antialiased");
  });
});

// ---------------------------------------------------------------------------
// metadata
// ---------------------------------------------------------------------------

describe("metadata", () => {
  it("has the correct title", () => {
    expect(metadata.title).toBe("Ice Cream Calculator");
  });

  it("has a description", () => {
    expect(metadata.description).toBe("A simple ice cream calculator");
  });
});
