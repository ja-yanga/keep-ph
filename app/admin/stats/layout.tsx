import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website Analytics | Admin",
  description: "View website traffic and user engagement metrics.",
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
