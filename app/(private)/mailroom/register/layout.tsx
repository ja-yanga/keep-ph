import { baseMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "Keep PH - Register Mailroom",
  description:
    "Register your mailroom with Keep PH. Secure addresses, package management, and digital scanning—all in one platform.",
};

export default function MailroomRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
