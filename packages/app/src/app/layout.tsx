import "./globals.css";

import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

import { Navbar } from "@/app/navbar";
import { SessionResourcesProvider } from "@/lib/session-resources";
import { GroupByProvider } from "@/lib/group-by";
import { WebVitals } from "@/app/_elements/web-vitals";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/** Next.js metadata for the application */
export const metadata: Metadata = {
  title: "Ice Cream Calculator",
  description: "A simple ice cream calculator",
};

/** Root layout: sets up fonts, session, theme, navbar, and observability providers */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <SessionProvider>
          <SessionResourcesProvider>
            <ThemeProvider attribute="class">
              <GroupByProvider>
                <Navbar>{children}</Navbar>
              </GroupByProvider>
            </ThemeProvider>
          </SessionResourcesProvider>
        </SessionProvider>
        <WebVitals />
        {process.env.VERCEL && <Analytics />}
        {process.env.VERCEL && <SpeedInsights />}
      </body>
    </html>
  );
}
