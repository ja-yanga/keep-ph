import PublicMainLayout from "@/components/Layout/PublicMainLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - Keep PH",
  description: "Sign Up to Keep PH",
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicMainLayout>{children}</PublicMainLayout>;
}
