import { baseMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "KYC Verifications | Admin | Keep PH",
  description: "Manage and verify user KYC submissions.",
};

export default function AdminKycLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
