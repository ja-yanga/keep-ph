"use client";

import { Container, Title, Group, Anchor, Button, Box } from "@mantine/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (pathname === "/") {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      router.push(`/#${id}`);
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
          {/* Left: Brand */}
          <Link href="/" style={{ textDecoration: "none" }}>
            <Title order={3} style={{ fontWeight: 800, color: "#1A237E" }}>
              Keep PH
            </Title>
          </Link>

          {/* Center: navigation links */}
          <Group gap="lg" visibleFrom="sm">
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
              style={{ color: "#1A237E", fontWeight: 500 }}
              underline="hover"
            >
              Login
            </Anchor>
          </Group>

          {/* Right: Call to action */}
          <Button
            component={Link}
            href="/signup"
            style={{
              minWidth: 120,
              backgroundColor: "#1A237E",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Sign Up
          </Button>
        </Group>
      </Container>
    </Box>
  );
}
