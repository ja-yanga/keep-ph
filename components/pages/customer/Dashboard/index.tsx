"use client";

import { Box, Center, Loader } from "@mantine/core";

import { useSession } from "@/components/SessionProvider";
import DashboardContentWithMailRoom from "./components/DashboardContentWithMailRoom";
import DashboardContentNoMailRoom from "./components/DashboardContentNoMailRoom";

export default function Dashboard({
  initialRegistrations = [],
}: {
  initialRegistrations?: unknown[];
}) {
  const { session, loading } = useSession();
  const firstName = session?.profile?.first_name ?? null;
  const displayName = firstName ?? session?.user?.email ?? "User";
  const hasMailroom = Array.isArray(initialRegistrations)
    ? initialRegistrations.length > 0
    : false;

  let content: React.ReactNode;

  if (loading) {
    content = (
      <Center style={{ paddingTop: 64, paddingBottom: 64 }}>
        <Loader />
      </Center>
    );
  } else if (!hasMailroom) {
    content = (
      <DashboardContentNoMailRoom displayName={displayName} loading={loading} />
    );
  } else {
    content = <DashboardContentWithMailRoom />;
  }

  return (
    <Box style={{ flex: 1, paddingTop: 32, paddingBottom: 32 }}>
      <main id="main" tabIndex={-1}>
        {content}
      </main>
    </Box>
  );
}
