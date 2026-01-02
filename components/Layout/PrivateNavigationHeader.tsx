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
import { IconUser } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { NAV_ITMES } from "@/utils/constants/nav-items";
import Notifications from "../Notifications";

export default function PrivateNavigationHeader() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const { session } = useSession();

  const role = session?.role;
  const showLinks = !pathname.startsWith("/onboarding");
  const isAdmin = role === "admin";

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

  return (
    <Box
      component="header"
      style={{
        position: "sticky",
        zIndex: 50,
        width: "100%",
        borderBottom: "1px solid #e5e7eb",
        backdropFilter: "blur(10px)",
        backgroundColor: "rgba(255,255,255,0.8)",
      }}
      py="md"
    >
      <Container size="xl">
        <Group justify="space-between" align="center" w="100%">
          {/* LEFT SIDE NAV BRAND*/}
          <Link
            href={isAdmin ? "/admin/dashboard" : "/dashboard"}
            style={{ textDecoration: "none" }}
          >
            <Title order={3} fw={800} c="#1A237E">
              Keep PH
            </Title>
          </Link>

          {/* Nav links - hidden on onboarding, wait for session */}
          {showLinks && session && (
            <Group gap="lg" visibleFrom="sm">
              {((role && NAV_ITMES[role]) || []).map((nav, key) => {
                return (
                  <Anchor
                    key={key}
                    component={Link}
                    href={nav.path}
                    style={linkColor(nav.path)}
                    underline="hover"
                  >
                    {nav.title}
                  </Anchor>
                );
              })}
            </Group>
          )}

          {/* RIGHT SIDE NAV*/}
          <Group gap="sm">
            {/* NOTIFICATION BELL */}
            {showLinks && role === "user" && <Notifications />}

            {/* PROFILE */}
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

            {/* LOGOUT */}
            <Button
              component="button"
              onClick={handleSignOut}
              loading={loading}
              variant="outline"
              bd="1px solid #26316D"
              bdrs={999}
              fw={600}
              c="#26316D"
              px={18}
            >
              Logout
            </Button>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
