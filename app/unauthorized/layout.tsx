import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unauthorized | Keep PH",
  description: "You do not have permission to access this page.",
};

export default function UnauthorizedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
