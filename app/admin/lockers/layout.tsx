import type { Metadata } from "next";

export const metadata: Metadata = {
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
