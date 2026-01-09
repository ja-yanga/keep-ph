import type { Metadata } from "next";

export const metadata: Metadata = {
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
