"use client";

import {
  Container,
  Title,
  Group,
  Anchor,
  Button,
  Box,
  Burger,
  Drawer,
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function PublicNavigationHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [opened, { toggle, close }] = useDisclosure(false);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    close();

    if (pathname === "/") {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      router.push(`/#${id}`);
    }
  };

  // Turn this into a constant variable instead of a nested component function
  const navLinks = (
    <>
      <Anchor
        href="/#services"
        onClick={(e) => handleScroll(e, "services")}
        style={{ color: "#1A237E", fontWeight: 500 }}
        underline="hover"
      >
        Services
      </Anchor>
      <Anchor
        href="/#pricing"
        onClick={(e) => handleScroll(e, "pricing")}
        style={{ color: "#1A237E", fontWeight: 500 }}
        underline="hover"
      >
        Pricing
      </Anchor>
      <Anchor
        component={Link}
        href="/signin"
        onClick={close}
        style={{ color: "#1A237E", fontWeight: 500 }}
        underline="hover"
      >
        Login
      </Anchor>
    </>
  );

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
        <Group
          justify="space-between"
          align="center"
          style={{ width: "100%" }}
          wrap="nowrap"
        >
          <Group gap="sm">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              color="#1A237E"
              aria-label={
                opened ? "Close navigation menu" : "Open navigation menu"
              }
            />

            <Link href="/" style={{ textDecoration: "none" }}>
              <Title order={3} style={{ fontWeight: 800, color: "#1A237E" }}>
                Keep PH
              </Title>
            </Link>
          </Group>

          {/* Use {navLinks} as a variable here */}
          <Group gap="lg" visibleFrom="sm">
            {navLinks}
          </Group>

          <Button
            component={Link}
            href="/signup"
            style={{
              minWidth: 100,
              backgroundColor: "#1A237E",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Sign Up
          </Button>
        </Group>
      </Container>

      <Drawer
        opened={opened}
        onClose={close}
        title="Menu"
        size="xs"
        hiddenFrom="sm"
        styles={{
          title: { fontWeight: 700, color: "#1A237E" },
        }}
      >
        <Stack gap="md" mt="lg">
          {/* Use {navLinks} as a variable here too */}
          {navLinks}
          <Button
            component={Link}
            href="/signup"
            onClick={close}
            fullWidth
            mt="md"
            style={{ backgroundColor: "#1A237E" }}
          >
            Get Started
          </Button>
        </Stack>
      </Drawer>
    </Box>
  );
}
