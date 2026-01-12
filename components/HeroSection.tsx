import React from "react";
import {
  Container,
  Grid,
  Stack,
  Title,
  Text,
  Button,
  Box,
  Group,
} from "@mantine/core";
import NextImage from "next/image";
import Link from "next/link";

// Static constants outside the component to prevent re-allocation
const COLORS = {
  primaryBlue: "#1A237E",
  textSecondary: "#4A5568",
};

const SECTION_STYLE = {
  background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
  paddingTop: "clamp(2.5rem, 8vh, 5rem)",
  paddingBottom: "clamp(3.75rem, 10vh, 5rem)",
  overflow: "hidden" as const,
};

const IMAGE_CONTAINER_STYLE = {
  position: "relative" as const,
  maxWidth: "100%",
  margin: "0 auto",
};

const GLOW_STYLE = {
  position: "absolute" as const,
  top: "-10%",
  left: "-10%",
  width: "120%",
  height: "120%",
  background:
    "radial-gradient(circle, rgba(26,35,126,0.06) 0%, rgba(255,255,255,0) 70%)",
  zIndex: 0,
};

const IMAGE_WRAPPER_STYLE = {
  position: "relative" as const,
  zIndex: 1,
  boxShadow: "var(--mantine-shadow-xl)",
  borderRadius: "var(--mantine-radius-lg)",
  backgroundColor: "#f1f3f5",
  overflow: "hidden" as const,
  aspectRatio: "3 / 2",
};

export default function HeroSection() {
  return (
    <Box component="section" style={SECTION_STYLE}>
      <Container size="xl">
        <Grid gutter={{ base: 40, md: 80 }} align="center">
          <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 1, md: 2 }}>
            <Box style={IMAGE_CONTAINER_STYLE}>
              <Box style={GLOW_STYLE} />
              <Box style={IMAGE_WRAPPER_STYLE}>
                <NextImage
                  src="/hero.avif"
                  alt="Modern Philippines Office"
                  width={950}
                  height={634}
                  priority
                  fetchPriority="high"
                  quality={80}
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </Box>
            </Box>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 2, md: 1 }}>
            <Stack gap="xl" style={{ alignItems: "flex-start" }}>
              <Title
                order={1}
                style={{
                  fontWeight: 900,
                  fontSize: "clamp(2.5rem, 5vw, 3.75rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                  color: COLORS.primaryBlue,
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
                size="xl"
                lh={1.6}
                style={{ color: COLORS.textSecondary, maxWidth: 540 }}
              >
                Get a prestigious virtual address in Metro Manila. Manage your
                mail digitally and forward packages anywhere in the world with
                ease.
              </Text>

              <Group
                gap="sm"
                w="100%"
                mt="md"
                wrap="nowrap"
                className="hero-group"
              >
                <Button
                  component={Link}
                  href="/signup"
                  size="xl"
                  radius="xl"
                  color={COLORS.primaryBlue}
                  rightSection={<ArrowRightIcon size={22} />}
                  style={{
                    flex: 1,
                    boxShadow: "0 12px 24px rgba(26, 35, 126, 0.25)",
                  }}
                >
                  Get Started
                </Button>
                <Button
                  component="a"
                  href="#pricing"
                  size="xl"
                  variant="outline"
                  radius="xl"
                  style={{
                    flex: 1,
                    backgroundColor: "white",
                    color: COLORS.textSecondary,
                    borderColor: COLORS.textSecondary,
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

// server component arrow icon (no external icon lib)
const ArrowRightIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M5 12h14M13 5l7 7-7 7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
