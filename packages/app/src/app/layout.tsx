import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

import { Navbar } from "@/app/navbar";
import { WebVitals } from "@/app/_elements/web-vitals";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/** Next.js metadata for the application */
export const metadata: Metadata = {
  title: "Ice Cream Calculator",
  description: "A simple ice cream calculator",
};

/** Root layout: sets up fonts, session, theme, navbar, and observability providers */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <ThemeProvider attribute="class">
            <Navbar>{children}</Navbar>
          </ThemeProvider>
        </SessionProvider>
        <WebVitals />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
