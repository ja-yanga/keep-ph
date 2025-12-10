"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
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

  // keep popover state local (UI unchanged)
  const [notifOpen, setNotifOpen] = useState(false);

  const { session } = useSession();
  // normalize role: some session shapes have role on root, others under user
  const roleRaw = session?.role ?? session?.user?.role;
  const role = typeof roleRaw === "string" ? roleRaw.toLowerCase() : roleRaw;
  const showLinks = !pathname.startsWith("/onboarding");
  const isAdmin = role === "admin";

  // normalize userId to avoid accessing possibly-null session directly
  const userId = session?.user?.id;

  // helper to validate UUID (prevents passing invalid value to Postgres)
  const isValidUUID = (id?: any) =>
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    );

  // treat as "user" when session exists and role is not admin (handles missing/undefined role)
  const isUser = !!session && role !== "admin";
  // SWR key: only when we have a valid user uuid and user role
  const swrKey =
    isValidUUID(userId) && isUser ? ["notifications", userId] : null;

  // fetcher that reads latest 10 notifications for user
  const fetchNotifications = async (key: any) => {
    // SWR can call fetcher with the key array (['notifications', userId]) or a string.
    const uid = Array.isArray(key) ? key[1] : key;
    if (!isValidUUID(uid)) return [];
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(10);
    return data ?? [];
  };

  // don't force an additional mutate on mount — let SWR control fetching.
  // This avoids duplicate fetches (React StrictMode + SWR can cause multiple requests).

  // useSWR provides initial fetch and revalidation.
  // Set revalidateOnMount:false and a short dedupingInterval to avoid repeated fetches on mount.
  const { data, error } = useSWR<Notification[] | undefined>(
    swrKey,
    fetchNotifications,
    {
      revalidateOnFocus: true,
      revalidateOnMount: false,
      revalidateIfStale: false,
      dedupingInterval: 2000,
    }
  );

  const notifications: Notification[] = Array.isArray(data) ? data : [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Realtime subscription: mutate SWR cache on INSERT so list updates immediately
  useEffect(() => {
    if (!isValidUUID(userId) || !isUser) return;

    const channel = supabase
      .channel(`notifications-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const key = ["notifications", userId];
          mutate(
            key,
            (current: Notification[] = []) => {
              const next = [payload.new as Notification, ...current];
              return next.slice(0, 10);
            },
            false
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role]);

  // mark all as read (optimistic update + persist)
  const markAsRead = async () => {
    if (!isValidUUID(userId) || role !== "user") return;

    const key = ["notifications", userId];

    // optimistic update in SWR cache
    mutate(
      key,
      (current: Notification[] = []) =>
        current.map((n) => ({ ...n, is_read: true })),
      false
    );

    // persist to DB
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
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

  // keep UI exactly the same, using `notifications` and `unreadCount` above
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
                    href="/admin/rewards"
                    style={linkColor("/admin/rewards")}
                    underline="hover"
                  >
                    Rewards
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
                    href="/storage"
                    style={linkColor("/storage")}
                    underline="hover"
                    aria-current={pathname === "/storage" ? "page" : undefined}
                  >
                    Storage
                  </Anchor>
                </>
              )}
            </Group>
          )}

          {/* Right: optionally show notifications, always show logout */}
          <Group gap="sm">
            {showLinks && role === "user" && (
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
