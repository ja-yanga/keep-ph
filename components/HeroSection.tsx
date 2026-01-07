"use client";

import {
  Container,
  Grid,
  Stack,
  Title,
  Text,
  Button,
  Image,
  Box,
  rem,
  Group,
} from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import Link from "next/link";
import { useMediaQuery } from "@mantine/hooks";

export default function HeroSection() {
  const isMobile = useMediaQuery("(max-width: 48em)");

  // Custom scroll handler to ensure it works every time
  const scrollToPricing = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById("pricing");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Box
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
        paddingTop: isMobile ? rem(40) : rem(80),
        paddingBottom: isMobile ? rem(60) : rem(60),
        overflow: "hidden",
      }}
    >
      <Container size="xl">
        <Grid gutter={isMobile ? 40 : 80} align="center">
          {/* IMAGE BLOCK */}
          <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 1, md: 2 }}>
            <Box
              style={{
                position: "relative",
                maxWidth: isMobile ? "85%" : "100%",
                margin: "0 auto",
              }}
            >
              <Box
                style={{
                  position: "absolute",
                  top: "-10%",
                  left: "-10%",
                  width: "120%",
                  height: "120%",
                  background:
                    "radial-gradient(circle, rgba(26,35,126,0.06) 0%, rgba(255,255,255,0) 70%)",
                  zIndex: 0,
                }}
              />

              <Box
                style={{
                  position: "relative",
                  zIndex: 1,
                  boxShadow: "var(--mantine-shadow-xl)",
                  borderRadius: "var(--mantine-radius-lg)",
                  transform: isMobile ? "none" : "rotate(2deg)",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <Image
                  src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                  alt="Modern Philippines Office"
                  radius="lg"
                />
              </Box>
            </Box>
          </Grid.Col>

          {/* TEXT BLOCK */}
          <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 2, md: 1 }}>
            <Stack
              gap={isMobile ? "lg" : "xl"}
              align={isMobile ? "center" : "flex-start"}
            >
              <Title
                order={1}
                ta={isMobile ? "center" : "left"}
                style={{
                  fontWeight: 900,
                  fontSize: isMobile ? rem(40) : rem(60),
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                  color: "#1A237E",
                }}
              >
                Your Business Address in the{" "}
                <Text
                  span
                  inherit
                  variant="gradient"
                  gradient={{ from: "#1A237E", to: "#4C51BF", deg: 45 }}
                >
                  Philippines
                </Text>
              </Title>

              <Text
                c="dimmed"
                size={isMobile ? "lg" : "xl"}
                ta={isMobile ? "center" : "left"}
                lh={1.6}
                style={{ maxWidth: 540 }}
              >
                Get a prestigious virtual address in Metro Manila. Manage your
                mail digitally and forward packages anywhere in the world with
                ease.
              </Text>

              <Group
                gap="sm"
                w="100%"
                mt="md"
                wrap={isMobile ? "wrap" : "nowrap"}
              >
                <Button
                  component={Link}
                  href="/signup"
                  size="xl"
                  radius="xl"
                  color="#1A237E"
                  fullWidth={isMobile}
                  rightSection={<IconArrowRight size={22} />}
                  style={{
                    boxShadow: "0 12px 24px rgba(26, 35, 126, 0.25)",
                    flex: isMobile ? "none" : 1,
                  }}
                >
                  Get Started
                </Button>

                {/* FIXED: Using onClick instead of Link for reliable scrolling */}
                <Button
                  onClick={scrollToPricing}
                  size="xl"
                  variant="outline"
                  radius="xl"
                  color="gray"
                  fullWidth={isMobile}
                  style={{
                    flex: isMobile ? "none" : 1,
                    backgroundColor: "white",
                  }}
                >
                  View Pricing
                </Button>
              </Group>
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}
