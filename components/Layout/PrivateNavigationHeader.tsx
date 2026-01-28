"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Group,
  Title,
  Button,
  ActionIcon,
  Tooltip,
  Burger,
  Drawer,
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconUser } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { NAV_ITMES } from "@/utils/constants/nav-items";
import Notifications from "../Notifications";
import { startRouteProgress } from "@/lib/route-progress";

export default function PrivateNavigationHeader() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [opened, { toggle, close }] = useDisclosure(false); // Mobile drawer state

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
      fontSize: "1rem",
      textDecoration: "none",
    };
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

  const handleRouteClick = (href: string) => {
    if (pathname !== href) {
      startRouteProgress();
    }
    close();
  };

  const navLinks = ((role && NAV_ITMES[role]) || []).map((nav, key) => (
    <Link
      key={key}
      href={nav.path}
      style={linkColor(nav.path)}
      onClick={() => handleRouteClick(nav.path)} // Close drawer when link is clicked
    >
      {nav.title}
    </Link>
  ));

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
        <Group justify="space-between" align="center" w="100%" wrap="nowrap">
          <Group>
            {/* BURGER FOR MOBILE */}
            {showLinks && (
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
                aria-label="Toggle navigation menu"
                aria-expanded={opened}
                aria-controls="mobile-navigation-drawer"
              />
            )}

            <Link
              href={isAdmin ? "/admin/dashboard" : "/dashboard"}
              style={{ textDecoration: "none" }}
              aria-label="Keep PH - Home"
            >
              <Title order={1} fw={800} c="#1A237E">
                Keep PH
              </Title>
            </Link>
          </Group>

          {/* DESKTOP NAV LINKS - Hidden on Mobile */}
          {showLinks && session && (
            <Group gap="lg" visibleFrom="sm">
              {navLinks}
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
                onClick={() => startRouteProgress()}
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
              visibleFrom="xs"
              aria-label="Sign out of your account"
            >
              Logout
            </Button>
          </Group>
        </Group>
      </Container>

      {/* MOBILE DRAWER */}
      <Drawer
        opened={opened}
        onClose={close}
        title="Navigation"
        size="xs"
        hiddenFrom="sm"
        id="mobile-navigation-drawer"
      >
        <Stack gap="md" mt="xl">
          {navLinks}
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
      </Drawer>
    </Box>
  );
}
