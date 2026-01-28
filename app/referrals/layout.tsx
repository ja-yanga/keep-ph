import { Metadata } from "next";
import { baseMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "Referrals | Keep-PH",
  description:
    "View your referral list and track the claiming status of each referral.",
};

export default function ReferralsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
