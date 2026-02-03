import type { Metadata } from "next";
import { baseMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "Lockers | Admin | Keep PH",
  description: "Manage mailroom lockers.",
};

export default function AdminLockersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
