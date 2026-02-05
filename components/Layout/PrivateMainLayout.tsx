"use client";

import { memo } from "react";
import { Box, AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { usePathname } from "next/navigation";
import Footer from "./Footer";
import PrivateNavigationHeader from "./PrivateNavigationHeader";
import { useSession } from "@/components/SessionProvider";
import PrivateAdminSidebar from "./PrivateAdminSidebar";

const LAYOUT_STYLE = {
  minHeight: "100dvh",
  backgroundColor: "#FFFFFF",
};

function PrivateMainLayoutComponent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname() ?? "/";
  const { session } = useSession();
  const role = session?.role;
  const isAdmin = role === "admin";
  const isApprover = role === "approver";
  const isOwner = role === "owner";
  // Only show sidebar for admin roles (admin, approver, owner)
  const showSidebar = isAdmin || isApprover || isOwner;
  const showLinks = !pathname.startsWith("/onboarding");

  const layoutKey = `${session?.user?.id ?? "anon"}-${role ?? "none"}`;

  return (
    <AppShell
      key={layoutKey}
      navbar={
        showSidebar
          ? {
              width: 280,
              breakpoint: "md",
              collapsed: { mobile: true, desktop: false },
            }
          : undefined
      }
      header={{
        height: 70,
        offset: false,
      }}
      padding={0}
    >
      <AppShell.Main style={LAYOUT_STYLE}>
        {/* Desktop Header */}
        {showLinks && (
          <PrivateNavigationHeader opened={opened} toggle={toggle} />
        )}
        {showSidebar && <PrivateAdminSidebar opened={opened} onClose={close} />}

        <Box
          style={{
            minHeight: "calc(100dvh - var(--app-shell-header-height, 0px))",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box style={{ flex: 1 }}>{children}</Box>
          <Footer />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

export default memo(PrivateMainLayoutComponent);
