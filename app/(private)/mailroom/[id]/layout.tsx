import { Metadata } from "next";
import { baseMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "Mailroom | Keep-PH",
  description:
    "Manage your mailboxes and incoming mail. Request document or parcel release, disposal, or scanning directly from your mailroom dashboard.",
};

export default function MailroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
