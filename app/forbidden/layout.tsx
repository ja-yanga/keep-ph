import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forbidden | Keep PH",
  description: "Access to this page is restricted.",
};

export default function ForbiddenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
