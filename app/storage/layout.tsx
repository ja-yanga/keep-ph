import { Metadata } from "next";
import { baseMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...baseMetadata,
  title: "Storage | Keep-PH",
  description: "View your uploaded files and manage your storage.",
};

export default function StorageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
