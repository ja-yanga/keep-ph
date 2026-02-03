import { Metadata } from "next";
import { baseMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "KYC Submission | Keep-PH",
  description:
    "Fill out your KYC form to verify your identity and submit necessary documents securely.",
};

export default function CustomerKycLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
