import { baseMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "Keep PH - Digital Mailroom",
  description:
    "Digitize and manage your physical mail with Keep PH. Secure addresses, package management, and digital scanning—all in one platform.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
