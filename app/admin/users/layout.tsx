import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users | Admin | Keep PH",
  description: "Manage user roles.",
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
