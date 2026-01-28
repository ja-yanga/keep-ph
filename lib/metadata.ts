import type { Metadata } from "next";

export const baseMetadata: Metadata = {
  title: {
    default: "Keep PH",
    template: "%s | Keep PH",
  },
  description: "Keep PH",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Keep PH",
  },
};
