import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
// import "./globals.css";
// Import Mantine CSS - Next.js will optimize this automatically
import "@mantine/core/styles.css";
import "mantine-datatable/styles.css";

import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import ServerSessionProvider from "@/components/ServerSessionProvider";
import GoogleAnalytics from "@/components/GoogleAnalytics";

// Optimize font loading with display swap to prevent render-blocking
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Prevent render-blocking
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Prevent render-blocking
  preload: false, // Only preload primary font
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Keep PH - Admin Dashboard",
  description:
    "Admin dashboard for managing packages, users, and mailroom operations",
  // Optimize for performance
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  openGraph: {
    title: "Keep PH - Admin Dashboard",
    description:
      "Admin dashboard for managing packages, users, and mailroom operations",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Add Google Analytics here */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}

        <MantineProvider theme={{ fontFamily: inter.style.fontFamily }}>
          <ServerSessionProvider>{children}</ServerSessionProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
