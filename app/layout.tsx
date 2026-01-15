import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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

// CRITICAL: Use only ONE font to minimize render-blocking
const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Prevent FOIT (Flash of Invisible Text)
  preload: false, // Let Next.js optimize font loading to reduce critical path latency
  fallback: ["system-ui", "arial"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Keep PH - Admin Dashboard",
  description:
    "Admin dashboard for managing packages, users, and mailroom operations",
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
        {/* DNS Prefetch for external resources */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        {/* Use dns-prefetch instead of preconnect for Supabase - connections happen after page load */}
        <link
          rel="dns-prefetch"
          href="https://rqdyfadbeafmunvmlqcp.supabase.co"
        />
      </head>
      <body
        className={inter.className}
        suppressHydrationWarning
        style={{ fontFamily: inter.style.fontFamily }}
      >
        {/* Add Google Analytics here */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}

        <MantineProvider>
          <ServerSessionProvider>{children}</ServerSessionProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
