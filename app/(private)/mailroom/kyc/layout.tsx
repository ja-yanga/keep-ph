import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit KYC | Keep-PH",
  description: "Submit your KYC to verify your identity.",
};

export default function CustomerKycLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
