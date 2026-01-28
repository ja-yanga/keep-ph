import type { Metadata } from "next";
import { baseMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "Mailrooms | Admin | Keep PH",
  description: "Manage mailroom registrations and subscriptions.",
};

export default function AdminMailroomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
