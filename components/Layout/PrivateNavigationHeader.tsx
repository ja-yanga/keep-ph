"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Group,
  Button,
  ActionIcon,
  Tooltip,
  Burger,
  Title,
  Drawer,
  NavLink,
  Stack,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconUser } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import Notifications from "../Notifications";
import { startRouteProgress } from "@/lib/route-progress";
import { NAV_ITMES } from "@/utils/constants/nav-items";
import {
  IconLayoutDashboard,
  IconMail,
  IconUsers,
  IconBox,
} from "@tabler/icons-react";

export default function PrivateNavigationHeader({
  opened,
  toggle,
}: {
  opened?: boolean;
  toggle?: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [
    customerDrawerOpened,
    { open: openCustomerDrawer, close: closeCustomerDrawer },
  ] = useDisclosure(false);

  const supabase = createClient();
  const { session } = useSession();

  const role = session?.role;
  const isAdmin = role === "admin";
  const isCustomer = role === "user";
  const showLinks = !pathname.startsWith("/onboarding");

  // Get navigation items for customer
  const customerNavItems = isCustomer && role ? NAV_ITMES[role] || [] : [];

  // Map navigation keys to icons
  const getIcon = (key: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      dashboard: <IconLayoutDashboard size={18} />,
      "register-mail-service": <IconMail size={18} />,
      referrals: <IconUsers size={18} />,
      storage: <IconBox size={18} />,
    };
    return iconMap[key] || null;
  };

  const handleRouteClick = (href: string) => {
    if (pathname !== href) {
      startRouteProgress();
    }
    closeCustomerDrawer();
  };

  const handleSignOut = async () => {
    startRouteProgress();
    setLoading(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      await supabase.auth.signOut();
      router.push("/signin");
    } catch (err) {
      console.error("signout error:", err);
      alert("Could not sign out. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box
        component="header"
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #e5e7eb",
        }}
        p="md"
      >
        <Container size="xl" style={{ width: "100%", padding: "0px 0px" }}>
          <Group justify="space-between" align="center" w="100%" wrap="nowrap">
            {/* LEFT SIDE - Logo and Navigation */}
            <Group gap="md" wrap="nowrap">
              {/* Mobile Burger and Logo */}
              {showLinks && (
                <Group gap="xs" hiddenFrom="sm">
                  {isAdmin && (
                    <>
                      <Burger
                        opened={opened}
                        onClick={toggle}
                        size="sm"
                        aria-label="Toggle sidebar"
                        aria-expanded={opened}
                        aria-controls="admin-sidebar"
                        color="#1A237E"
                      />
                      <Link
                        href={isAdmin ? "/admin/dashboard" : "/dashboard"}
                        style={{ textDecoration: "none" }}
                        aria-label="Keep PH - Home"
                      >
                        <Title order={2} fw={800} c="#1A237E" size="h3">
                          Keep PH
                        </Title>
                      </Link>
                    </>
                  )}
                  {isCustomer && (
                    <>
                      <Burger
                        opened={customerDrawerOpened}
                        onClick={openCustomerDrawer}
                        size="sm"
                        aria-label="Toggle navigation"
                        aria-expanded={customerDrawerOpened}
                        color="#1A237E"
                        aria-controls="mobile-navigation-drawer"
                      />
                      <Link
                        href="/dashboard"
                        style={{ textDecoration: "none" }}
                        aria-label="Keep PH - Home"
                      >
                        <Title order={2} fw={800} c="#1A237E" size="h3">
                          Keep PH
                        </Title>
                      </Link>
                    </>
                  )}
                </Group>
              )}

              {/* Desktop Logo */}
              {showLinks && !isAdmin && (
                <Link
                  href="/dashboard"
                  style={{ textDecoration: "none" }}
                  aria-label="Keep PH - Home"
                >
                  <Title order={3} fw={800} c="#1A237E" visibleFrom="sm">
                    Keep PH
                  </Title>
                </Link>
              )}
            </Group>

            {/* Customer Navigation Items - Desktop */}
            {showLinks && isCustomer && customerNavItems.length > 0 && (
              <Group gap={4} visibleFrom="sm" wrap="nowrap">
                {customerNavItems.map((nav) => {
                  const isActive =
                    pathname === nav.path ||
                    pathname.startsWith(nav.path + "/");
                  return (
                    <Button
                      key={nav.key}
                      component={Link}
                      href={nav.path}
                      variant={isActive ? "filled" : "subtle"}
                      leftSection={getIcon(nav.key)}
                      onClick={() => handleRouteClick(nav.path)}
                      style={{
                        borderRadius: "8px",
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "#FFFFFF" : "#4B5563",
                        backgroundColor: isActive ? "#1A237E" : "transparent",
                      }}
                      size="sm"
                    >
                      {nav.title}
                    </Button>
                  );
                })}
              </Group>
            )}

            {/* RIGHT SIDE NAV */}
            <Group gap="sm" wrap="nowrap">
              {showLinks && role === "user" && <Notifications />}

              <Tooltip label="Account">
                <ActionIcon
                  component={Link}
                  href="/account"
                  variant="subtle"
                  color="gray"
                  radius="xl"
                  size="lg"
                  aria-label="View account settings"
                >
                  <IconUser size={20} aria-hidden="true" />
                </ActionIcon>
              </Tooltip>

              <Button
                onClick={handleSignOut}
                loading={loading}
                variant="outline"
                bd="1px solid #26316D"
                bdrs={999}
                fw={600}
                c="#26316D"
                px={18}
                visibleFrom={role === "user" ? "xs" : ""}
                aria-label="Sign out of your account"
              >
                Logout
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Mobile Navigation Drawer for Customers */}
      {showLinks && isCustomer && customerNavItems.length > 0 && (
        <Drawer
          opened={customerDrawerOpened}
          onClose={closeCustomerDrawer}
          title={
            <Link
              href="/dashboard"
              style={{ textDecoration: "none" }}
              aria-label="Keep PH - Home"
              onClick={closeCustomerDrawer}
            >
              <Title order={3} fw={800} c="#1A237E">
                Keep PH
              </Title>
            </Link>
          }
          size={280}
          hiddenFrom="sm"
          position="left"
          overlayProps={{ opacity: 0.5, blur: 4 }}
          transitionProps={{ duration: 200, timingFunction: "ease" }}
          zIndex={300}
          id="customer-mobile-navigation-drawer"
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
          <Box
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#FFFFFF",
            }}
          >
            <ScrollArea style={{ flex: 1 }}>
              <Stack gap={4} py="md">
                {customerNavItems.map((nav) => {
                  const isActive =
                    pathname === nav.path ||
                    pathname.startsWith(nav.path + "/");
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
                <Button
                  onClick={handleSignOut}
                  loading={loading}
                  variant="light"
                  color="red"
                  fullWidth
                  mt="xl"
                >
                  Logout
                </Button>
              </Stack>
            </ScrollArea>
          </Box>
        </Drawer>
      )}
    </>
  );
}
