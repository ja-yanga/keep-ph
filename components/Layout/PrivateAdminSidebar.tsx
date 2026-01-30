"use client";

import {
  Box,
  Title,
  Drawer,
  Stack,
  NavLink,
  ScrollArea,
  AppShell,
} from "@mantine/core";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { NAV_ITMES } from "@/utils/constants/nav-items";
import { startRouteProgress } from "@/lib/route-progress";
import {
  IconLayoutDashboard,
  IconMail,
  IconUsers,
  IconBox,
  IconUserCheck,
  IconMapPin,
  IconLock,
  IconPackage,
  IconCreditCard,
  IconAward,
  IconChartBar,
  IconReceipt,
  IconFileTime,
} from "@tabler/icons-react";

type PrivateAdminSidebarProps = {
  opened: boolean;
  onClose: () => void;
};

export default function PrivateAdminSidebar({
  opened,
  onClose,
}: PrivateAdminSidebarProps) {
  const pathname = usePathname() ?? "/";

  const { session } = useSession();

  const role = session?.role;
  const showLinks = !pathname.startsWith("/onboarding");
  const isAdmin = role === "admin";
  const isApprover = role === "approver";
  const isOwner = role === "owner";
  // Only show sidebar for admin roles (admin, approver, owner)
  const showSidebar = isAdmin || isApprover || isOwner;

  const handleRouteClick = (href: string) => {
    if (pathname !== href) {
      startRouteProgress();
    }
    onClose();
  };

  const navItems = (role && NAV_ITMES[role]) || [];

  // Map navigation keys to icons
  const getIcon = (key: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      dashboard: <IconLayoutDashboard size={20} />,
      "register-mail-service": <IconMail size={20} />,
      referrals: <IconUsers size={20} />,
      storage: <IconBox size={20} />,
      kyc: <IconUserCheck size={20} />,
      locations: <IconMapPin size={20} />,
      lockers: <IconLock size={20} />,
      mailrooms: <IconMail size={20} />,
      packages: <IconPackage size={20} />,
      plans: <IconCreditCard size={20} />,
      rewards: <IconAward size={20} />,
      stats: <IconChartBar size={20} />,
      users: <IconUsers size={20} />,
      transactions: <IconReceipt size={20} />,
      "activity-logs": <IconFileTime size={20} />,
    };
    return iconMap[key] || null;
  };

  const navigationLinks = showLinks && session && (
    <ScrollArea style={{ flex: 1 }}>
      <Stack gap={4} p="md">
        {navItems.map((nav) => {
          const isActive =
            pathname === nav.path || pathname.startsWith(nav.path + "/");
          return (
            <NavLink
              key={nav.key}
              component={Link}
              href={nav.path}
              label={nav.title}
              leftSection={getIcon(nav.key)}
              active={isActive}
              onClick={() => handleRouteClick(nav.path)}
              style={{
                borderRadius: "8px",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#1A237E" : "#4B5563",
              }}
            />
          );
        })}
      </Stack>
    </ScrollArea>
  );

  const desktopSidebarContent = (
    <Box
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid #e5e7eb",
      }}
    >
      {/* Logo/Brand Section */}
      <Box p="md">
        <Link
          href={isAdmin || isOwner ? "/admin/dashboard" : "/dashboard"}
          style={{ textDecoration: "none", textAlign: "center" }}
          aria-label="Keep PH - Home"
        >
          <Title order={2} fw={800} c="#1A237E" size="h2">
            Keep PH
          </Title>
        </Link>
      </Box>

      {/* Navigation Links */}
      {navigationLinks}
    </Box>
  );

  const mobileSidebarContent = (
    <Box
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* Navigation Links - No logo in mobile since Drawer has title */}
      {navigationLinks}
    </Box>
  );

  // Don't render sidebar for customer/user role
  if (!showSidebar) {
    return null;
  }

  return (
    <>
      {/* Desktop Sidebar - AppShell.Navbar */}
      <AppShell.Navbar p={0} withBorder={false} visibleFrom="md">
        {desktopSidebarContent}
      </AppShell.Navbar>

      {/* Mobile Drawer */}
      <Drawer
        opened={opened}
        onClose={onClose}
        title={
          <Link
            href={isAdmin || isOwner ? "/admin/dashboard" : "/dashboard"}
            style={{ textDecoration: "none" }}
            aria-label="Keep PH - Home"
            onClick={onClose}
          >
            <Title order={3} fw={800} c="#1A237E">
              Keep PH
            </Title>
          </Link>
        }
        size={280}
        hiddenFrom="md"
        position="left"
        overlayProps={{ opacity: 0.5, blur: 4 }}
        transitionProps={{ duration: 200, timingFunction: "ease" }}
        zIndex={300}
        id="mobile-sidebar-drawer"
        styles={{
          content: {
            display: "flex",
            flexDirection: "column",
          },
          body: {
            flex: 1,
            overflow: "hidden",
          },
        }}
      >
        {mobileSidebarContent}
      </Drawer>
    </>
  );
}
