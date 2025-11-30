"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Group,
  Title,
  Anchor,
  Button,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconBell, IconUser } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";

export default function DashboardNav() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Get session and role from the provider
  const { session } = useSession();
  const role = session?.role;

  const showLinks = !pathname.startsWith("/onboarding");
  const isAdmin = role === "admin";

  const linkColor = (href: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return {
      color: "#1A237E", // Consistent color with Nav
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
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <Title order={3} style={{ fontWeight: 800, color: "#1A237E" }}>
              Keep PH
            </Title>
          </Link>

          {/* Nav links - hidden on onboarding, wait for session */}
          {showLinks && session && (
            <Group gap="lg" visibleFrom="sm">
              <Anchor
                component={Link}
                href="/dashboard"
                style={linkColor("/dashboard")}
                underline="hover"
                aria-current={pathname === "/dashboard" ? "page" : undefined}
              >
                Dashboard
              </Anchor>

              {isAdmin ? (
                <>
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
                    href="#"
                    style={linkColor("/admin/mailroom")}
                    underline="hover"
                  >
                    Mailroom Services
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
                </>
              ) : (
                <>
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
              <ActionIcon
                variant="subtle"
                color="gray"
                radius="xl"
                size="lg"
                aria-label="notifications"
                disabled
              >
                <IconBell size={20} />
              </ActionIcon>
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
