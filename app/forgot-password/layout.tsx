import PublicMainLayout from "@/components/Layout/PublicMainLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password - Keep PH",
  description: "Forgot Password to Keep PH",
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicMainLayout>{children}</PublicMainLayout>;
}
