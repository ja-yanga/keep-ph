import type { Metadata } from "next";

export const metadata: Metadata = {
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
