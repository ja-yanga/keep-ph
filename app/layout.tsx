import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
// Import Mantine CSS - Next.js will optimize this automatically
import "@mantine/core/styles.css";
// Moved mantine-datatable styles to components using them to reduce initial CSS bundle
// import "mantine-datatable/styles.css";

import "mantine-datatable/styles.css";
import "nprogress/nprogress.css";
import "@/app/globals.css";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import ServerSessionProvider from "@/components/ServerSessionProvider";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import TopLoaderProvider from "@/components/provider/TopLoaderProvider";
import { StoreProvider } from "@/store/StoreProvider";

// CRITICAL: Use only ONE font to minimize render-blocking
const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Prevent FOIT (Flash of Invisible Text)
  preload: true, // Let Next.js optimize font loading to reduce critical path latency
  fallback: ["system-ui", "arial"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Keep PH",
  description:
    "Keep PH is a mailroom management system for the Philippine Postal Corporation (PPC)",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  openGraph: {
    title: "Keep PH",
    description:
      "Keep PH is a mailroom management system for the Philippine Postal Corporation (PPC)",
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
        className={inter.className}
        suppressHydrationWarning
        style={{ fontFamily: inter.style.fontFamily }}
      >
        {/* Add Google Analytics here */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        <MantineProvider>
          <StoreProvider>
            <ServerSessionProvider>
              <TopLoaderProvider />
              {children}
            </ServerSessionProvider>
          </StoreProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
