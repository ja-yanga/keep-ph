"use client";

import { Container, Title, Group, Anchor, Button, Box } from "@mantine/core";

export default function Nav() {
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
          {/* Left: Brand */}
          <Title order={3} style={{ fontWeight: 800, color: "#1A237E" }}>
            Keep PH
          </Title>

          {/* Center: navigation links */}
          <Box style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <Group spacing="md">
              <Anchor href="#" style={{ color: "#1A237E", fontWeight: 500 }}>
                Services
              </Anchor>
              <Anchor href="#" style={{ color: "#1A237E", fontWeight: 500 }}>
                Pricing
              </Anchor>
              <Anchor href="#" style={{ color: "#1A237E", fontWeight: 500 }}>
                Login
              </Anchor>
            </Group>
          </Box>

          {/* Right: Call to action */}
          <Box>
            <Button
              component="a"
              href="#"
              style={{
                minWidth: 120,
                backgroundColor: "#1A237E",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Sign Up
            </Button>
          </Box>
        </Group>
      </Container>
    </Box>
  );
}
