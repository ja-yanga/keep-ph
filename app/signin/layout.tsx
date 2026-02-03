import PublicMainLayout from "@/components/Layout/PublicMainLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - Keep PH",
  description: "Sign In to Keep PH",
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicMainLayout>{children}</PublicMainLayout>;
}
