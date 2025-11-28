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
      color: active ? "#1A237E" : "#6B7280",
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
      <Container size="xxl">
        <Group align="center" style={{ width: "100%" }}>
          {/* Brand */}
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <Title order={3} style={{ fontWeight: 800, color: "#1A237E" }}>
              Keep PH
            </Title>
          </Link>

          {/* Nav links - hidden on onboarding, wait for session */}
          {showLinks && session && (
            <Box
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "flex-start",
                marginLeft: 16,
              }}
            >
              <Group gap="md" className="nav-links-desktop">
                <Anchor
                  component={Link}
                  href="/dashboard"
                  style={linkColor("/dashboard")}
                  aria-current={pathname === "/dashboard" ? "page" : undefined}
                >
                  Dashboard
                </Anchor>

                {isAdmin ? (
                  <>
                    <Anchor
                      component={Link}
                      href="#"
                      style={linkColor("/admin/mailroom")}
                    >
                      Mailroom Services
                    </Anchor>
                    <Anchor
                      component={Link}
                      href="#"
                      style={linkColor("/admin/packages")}
                    >
                      Packages
                    </Anchor>
                    <Anchor
                      component={Link}
                      href="/admin/plans"
                      style={linkColor("/admin/plans")}
                    >
                      Service Plans
                    </Anchor>
                    <Anchor
                      component={Link}
                      href="/admin/locations"
                      style={linkColor("/admin/locations")}
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
                      aria-current={
                        pathname === "/register" ? "page" : undefined
                      }
                    >
                      Register Mail Service
                    </Anchor>
                    <Anchor
                      component={Link}
                      href="/referrals"
                      style={linkColor("/referrals")}
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
                      aria-current={
                        pathname === "/account" ? "page" : undefined
                      }
                    >
                      Account
                    </Anchor>
                  </>
                )}
              </Group>
            </Box>
          )}

          {/* Right: optionally show notifications, always show logout */}
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginLeft: showLinks ? 0 : "auto",
            }}
          >
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
          </Box>
        </Group>
      </Container>

      <style jsx>{`
        .nav-links-desktop {
          display: none;
        }
        @media (min-width: 768px) {
          .nav-links-desktop {
            display: flex !important;
          }
        }
      `}</style>
    </Box>
  );
}
