import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rewards | Admin | Keep PH",
  description: "Process rewards and referral claims.",
};

export default function RewardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
