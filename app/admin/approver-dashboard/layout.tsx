import { baseMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "Dashboard | Approver | Keep PH",
  description: "Manage Keep PH Workflows",
};

export default function ApproverDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
