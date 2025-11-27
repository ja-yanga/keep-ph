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
} from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardNav() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const showLinks = !pathname.startsWith("/onboarding");

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
          <Title order={3} style={{ fontWeight: 800, color: "#1A237E" }}>
            Keep PH
          </Title>

          {/* Nav links - hidden on onboarding */}
          {showLinks && (
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
                  href="/dashboard"
                  style={linkColor("/dashboard")}
                  aria-current={pathname === "/dashboard" ? "page" : undefined}
                >
                  Dashboard
                </Anchor>
                <Anchor
                  href="/register"
                  style={linkColor("/register")}
                  aria-current={pathname === "/register" ? "page" : undefined}
                >
                  Register Mail Service
                </Anchor>
                <Anchor
                  href="/referrals"
                  style={linkColor("/referrals")}
                  aria-current={pathname === "/referrals" ? "page" : undefined}
                >
                  Referrals
                </Anchor>
                <Anchor
                  href="/account"
                  style={linkColor("/account")}
                  aria-current={pathname === "/account" ? "page" : undefined}
                >
                  Account
                </Anchor>
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
              >
                <IconBell size={20} />
              </ActionIcon>
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
