"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Group,
  Title,
  Anchor,
  Button,
  ActionIcon,
  Tooltip,
  Popover,
  Text,
  Stack,
  Indicator,
  ScrollArea,
  ThemeIcon,
  Divider,
} from "@mantine/core";
import {
  IconBell,
  IconUser,
  IconPackage,
  IconTrash,
  IconScan,
  IconCheck,
} from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";

// Notification Type Definition
type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string;
};

export default function DashboardNav() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const { session } = useSession();
  const role = session?.role;
  const showLinks = !pathname.startsWith("/onboarding");
  const isAdmin = role === "admin";

  // Fetch Notifications
  const fetchNotifications = async () => {
    if (!session?.user?.id) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  };

  // Initial Fetch & Realtime Subscription
  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();

      // Subscribe to new notifications in real-time
      const channel = supabase
        .channel("realtime-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session?.user?.id]);

  const markAsRead = async () => {
    if (unreadCount === 0) return;

    // Optimistic update
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session?.user?.id)
      .eq("is_read", false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "PACKAGE_ARRIVED":
        return <IconPackage size={16} />;
      case "PACKAGE_DISPOSED":
        return <IconTrash size={16} />;
      case "SCAN_READY":
        return <IconScan size={16} />;
      case "PACKAGE_RELEASED":
        return <IconCheck size={16} />;
      default:
        return <IconBell size={16} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "PACKAGE_ARRIVED":
        return "blue";
      case "PACKAGE_DISPOSED":
        return "red";
      case "SCAN_READY":
        return "violet";
      case "PACKAGE_RELEASED":
        return "green";
      default:
        return "gray";
    }
  };

  const linkColor = (href: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return {
      color: "#1A237E",
      fontWeight: active ? 700 : 500,
    };
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      // Call server signout endpoint (clears HttpOnly cookies if set)
      await fetch("/api/auth/signout", { method: "POST" });

      // Also clear client session
      await supabase.auth.signOut();

      // navigate to signin
      router.push("/signin");
    } catch (err) {
      console.error("signout error:", err);
      alert("Could not sign out. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        borderBottom: "1px solid #e5e7eb",
        backdropFilter: "blur(10px)",
        backgroundColor: "rgba(255,255,255,0.8)",
      }}
      py="md"
    >
      <Container size="xl">
        <Group justify="space-between" align="center" style={{ width: "100%" }}>
          {/* Brand */}
          <Link
            href={isAdmin ? "/admin/dashboard" : "/dashboard"}
            style={{ textDecoration: "none" }}
          >
            <Title order={3} style={{ fontWeight: 800, color: "#1A237E" }}>
              Keep PH
            </Title>
          </Link>

          {/* Nav links - hidden on onboarding, wait for session */}
          {showLinks && session && (
            <Group gap="lg" visibleFrom="sm">
              {isAdmin ? (
                <>
                  <Anchor
                    component={Link}
                    href="/admin/dashboard"
                    style={linkColor("/admin/dashboard")}
                    underline="hover"
                  >
                    Dashboard
                  </Anchor>
                  <Anchor
                    component={Link}
                    href="/admin/lockers"
                    style={linkColor("/admin/lockers")}
                    underline="hover"
                  >
                    Lockers
                  </Anchor>
                  <Anchor
                    component={Link}
                    href="/admin/mailrooms"
                    style={linkColor("/admin/mailrooms")}
                    underline="hover"
                  >
                    Mailrooms
                  </Anchor>
                  <Anchor
                    component={Link}
                    href="/admin/packages"
                    style={linkColor("/admin/packages")}
                    underline="hover"
                  >
                    Packages
                  </Anchor>
                  <Anchor
                    component={Link}
                    href="/admin/plans"
                    style={linkColor("/admin/plans")}
                    underline="hover"
                  >
                    Service Plans
                  </Anchor>
                  <Anchor
                    component={Link}
                    href="/admin/locations"
                    style={linkColor("/admin/locations")}
                    underline="hover"
                  >
                    Registration Locations
                  </Anchor>
                  <Anchor
                    component={Link}
                    href="/admin/stats"
                    style={linkColor("/admin/stats")}
                    underline="hover"
                  >
                    Stats
                  </Anchor>
                </>
              ) : (
                <>
                  <Anchor
                    component={Link}
                    href="/dashboard"
                    style={linkColor("/dashboard")}
                    underline="hover"
                    aria-current={
                      pathname === "/dashboard" ? "page" : undefined
                    }
                  >
                    Dashboard
                  </Anchor>
                  <Anchor
                    component={Link}
                    href="/mailroom/register"
                    style={linkColor("/mailroom/register")}
                    underline="hover"
                    aria-current={pathname === "/register" ? "page" : undefined}
                  >
                    Register Mail Service
                  </Anchor>
                  <Anchor
                    component={Link}
                    href="/referrals"
                    style={linkColor("/referrals")}
                    underline="hover"
                    aria-current={
                      pathname === "/referrals" ? "page" : undefined
                    }
                  >
                    Referrals
                  </Anchor>
                  <Anchor
                    component={Link}
                    href="/account"
                    style={linkColor("/account")}
                    underline="hover"
                    aria-current={pathname === "/account" ? "page" : undefined}
                  >
                    Account
                  </Anchor>
                </>
              )}
            </Group>
          )}

          {/* Right: optionally show notifications, always show logout */}
          <Group gap="sm">
            {showLinks && (
              <Popover
                width={320}
                position="bottom-end"
                withArrow
                shadow="md"
                opened={notifOpen}
                onChange={setNotifOpen}
                onClose={markAsRead}
              >
                <Popover.Target>
                  <Indicator
                    color="red"
                    size={16}
                    label={unreadCount}
                    disabled={unreadCount === 0}
                    offset={4}
                  >
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      radius="xl"
                      size="lg"
                      aria-label="notifications"
                      onClick={() => setNotifOpen((o) => !o)}
                    >
                      <IconBell size={20} />
                    </ActionIcon>
                  </Indicator>
                </Popover.Target>
                <Popover.Dropdown p={0}>
                  <Box p="sm" bg="gray.0">
                    <Text size="sm" fw={700}>
                      Notifications
                    </Text>
                  </Box>
                  <Divider />
                  <ScrollArea h={300}>
                    {notifications.length === 0 ? (
                      <Box p="xl" ta="center">
                        <Text size="sm" c="dimmed">
                          No notifications yet
                        </Text>
                      </Box>
                    ) : (
                      <Stack gap={0}>
                        {notifications.map((n) => (
                          <Box
                            key={n.id}
                            p="sm"
                            style={{
                              borderBottom: "1px solid #f1f3f5",
                              backgroundColor: n.is_read ? "white" : "#f8f9fa",
                              cursor: n.link ? "pointer" : "default",
                            }}
                            onClick={() => {
                              if (n.link) router.push(n.link);
                              setNotifOpen(false);
                            }}
                          >
                            <Group align="flex-start" wrap="nowrap">
                              <ThemeIcon
                                color={getColor(n.type)}
                                variant="light"
                                size="md"
                                radius="xl"
                                mt={2}
                              >
                                {getIcon(n.type)}
                              </ThemeIcon>
                              <Box style={{ flex: 1 }}>
                                <Text size="sm" fw={600} lh={1.2} mb={2}>
                                  {n.title}
                                </Text>
                                <Text size="xs" c="dimmed" lh={1.4}>
                                  {n.message}
                                </Text>
                                <Text
                                  size="xs"
                                  c="dimmed"
                                  mt={4}
                                  style={{ fontSize: 10 }}
                                >
                                  {new Date(n.created_at).toLocaleString()}
                                </Text>
                              </Box>
                              {!n.is_read && (
                                <Box
                                  w={8}
                                  h={8}
                                  bg="blue"
                                  style={{ borderRadius: "50%" }}
                                  mt={6}
                                />
                              )}
                            </Group>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </ScrollArea>
                </Popover.Dropdown>
              </Popover>
            )}

            {/* Admin Account Icon (placed between Bell and Logout) */}
            {showLinks && isAdmin && (
              <Tooltip label="Account">
                <ActionIcon
                  component={Link}
                  href="/account"
                  variant="subtle"
                  color="gray"
                  radius="xl"
                  size="lg"
                  aria-label="account"
                >
                  <IconUser size={20} />
                </ActionIcon>
              </Tooltip>
            )}

            <Button
              component="button"
              onClick={handleSignOut}
              loading={loading}
              variant="outline"
              style={{
                borderColor: "#26316D",
                color: "#26316D",
                fontWeight: 600,
                borderRadius: 999,
                paddingLeft: 18,
                paddingRight: 18,
              }}
            >
              Logout
            </Button>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
