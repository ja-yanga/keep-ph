import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription Plans | Admin | Keep PH",
  description: "Manage service tiers and pricing plans.",
};

export default function PlansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
