"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];
export type Metric = Parameters<ReportWebVitalsCallback>[0];

// Extend Window interface to include our custom property
declare global {
  interface Window {
    __webVitals: Record<string, Metric>;
  }
}

const handleWebVitals: ReportWebVitalsCallback = (metric) => {
  console.log(`${metric.name}: ${parseFloat(metric.value.toFixed(2))} (rating: ${metric.rating})`);

  // Expose metrics for E2E testing
  if (typeof window !== "undefined") {
    window.__webVitals[metric.name] = metric;
  }
};

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
