import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Global auth guard for all routes within the (private) group
  await getAuthenticatedUser();

  return <>{children}</>;
}
