"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Box, Center, Loader } from "@mantine/core";

import { useSession } from "@/components/SessionProvider";
import type { RawRow } from "@/utils/types";

// Lazily load heavy dashboard content to reduce initial JS on mobile
// Disable SSR for client-only components to improve performance
const DashboardContentWithMailRoom = dynamic(
  () => import("./components/DashboardContentWithMailRoom"),
  {
    loading: () => (
      <Center style={{ paddingTop: 64, paddingBottom: 64 }}>
        <Loader />
      </Center>
    ),
    ssr: false,
  },
);

const DashboardContentNoMailRoom = dynamic(
  () => import("./components/DashboardContentNoMailRoom"),
  {
    loading: () => (
      <Center style={{ paddingTop: 64, paddingBottom: 64 }}>
        <Loader />
      </Center>
    ),
    ssr: false,
  },
);

export default function Dashboard({
  initialRegistrations = [],
}: {
  initialRegistrations?: unknown[];
}) {
  const { session, loading } = useSession();
  const firstName = session?.profile?.first_name ?? null;
  const displayName = useMemo(
    () => firstName ?? session?.user?.email ?? "User",
    [firstName, session?.user?.email],
  );
  const hasMailroom = useMemo(
    () =>
      Array.isArray(initialRegistrations) && initialRegistrations.length > 0,
    [initialRegistrations],
  );

  if (loading) {
    return (
      <Box style={{ flex: 1, paddingTop: 32, paddingBottom: 32 }}>
        <main id="main" tabIndex={-1}>
          <Center style={{ paddingTop: 64, paddingBottom: 64 }}>
            <Loader />
          </Center>
        </main>
      </Box>
    );
  }

  return (
    <Box style={{ flex: 1, paddingTop: 32, paddingBottom: 32 }}>
      <main id="main" tabIndex={-1}>
        {hasMailroom ? (
          <DashboardContentWithMailRoom
            initialData={
              Array.isArray(initialRegistrations)
                ? (initialRegistrations as RawRow[])
                : null
            }
          />
        ) : (
          <DashboardContentNoMailRoom
            displayName={displayName}
            loading={loading}
          />
        )}
      </main>
    </Box>
  );
}
