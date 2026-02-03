import type { Metadata } from "next";
import { baseMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "Locations | Admin | Keep PH",
  description: "Manage mailroom locations and capacity.",
};

export default function AdminLocationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
