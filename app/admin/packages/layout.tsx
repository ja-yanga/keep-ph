import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Packages | Admin | Keep PH",
  description: "Manage incoming packages and locker assignments.",
};

export default function PackagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
