"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";

/** Callback signature accepted by `useReportWebVitals` */
type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];
/** A single Web Vitals metric report produced by Next.js */
export type Metric = Parameters<ReportWebVitalsCallback>[0];

// Extend Window interface to include our custom property
declare global {
  interface Window {
    __webVitals: Record<string, Metric>;
  }
}

/** Log a Web Vitals metric to the console and expose it on `window.__webVitals` for E2E tests */
const handleWebVitals: ReportWebVitalsCallback = (metric) => {
  console.log(`${metric.name}: ${parseFloat(metric.value.toFixed(2))} (rating: ${metric.rating})`);

  // Expose metrics for E2E testing
  if (typeof window !== "undefined") {
    window.__webVitals[metric.name] = metric;
  }
};

/** Headless component that activates Web Vitals reporting and initializes `window.__webVitals` */
export function WebVitals() {
  useReportWebVitals(handleWebVitals);

  // Initialize the object immediately so tests know it exists
  useEffect(() => {
    if (typeof window !== "undefined" && !window.__webVitals) {
      window.__webVitals = {};
    }
  }, []);

  return null;
}
