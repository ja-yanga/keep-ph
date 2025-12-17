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
  Group,
  Badge,
  rem,
} from "@mantine/core";
import {IconArrowRight} from "@tabler/icons-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <Box
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0) 0%, #F1F3F5 100%)",
        paddingTop: "4rem",
        paddingBottom: "6rem",
      }}
    >
      <Container size="xl">
        <Grid gutter={50} align="center">
          <Grid.Col span={{base: 12, md: 6}}>
            <Stack gap="lg">
              <Badge
                variant="light"
                color="blue"
                size="lg"
                radius="sm"
                style={{width: "fit-content"}}
              >
                🚀 Now serving Metro Manila
              </Badge>
              <Title
                order={1}
                style={{
                  fontWeight: 800,
                  fontSize: rem(48),
                  lineHeight: 1.1,
                  color: "#1A237E",
                }}
              >
                Your Business Address in the{" "}
                <Text
                  span
                  inherit
                  variant="gradient"
                  gradient={{from: "#1A237E", to: "#3949AB", deg: 45}}
                >
                  Philippines
                </Text>
                , Simplified.
              </Title>
              <Text c="dimmed" size="xl" style={{maxWidth: 500}}>
                Get a prestigious virtual address, digital mail scanning, and
                mail forwarding services. Manage your mail from anywhere in the
                world.
              </Text>
              <Group mt="md">
                <Button
                  component={Link}
                  href="/signup"
                  size="xl"
                  radius="md"
                  color="#1A237E"
                  rightSection={<IconArrowRight size={20} />}
                >
                  Get Started
                </Button>
                <Button
                  component={Link}
                  href="#pricing"
                  size="xl"
                  variant="default"
                  radius="md"
                >
                  View Pricing
                </Button>
              </Group>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{base: 12, md: 6}}>
            <Box style={{position: "relative"}}>
              <Box
                style={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: "100%",
                  height: "100%",
                  background:
                    "linear-gradient(135deg, #E8EAF6 0%, #C5CAE9 100%)",
                  borderRadius: 24,
                  zIndex: 0,
                }}
              />
              <Image
                src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                alt="Modern Office"
                radius="lg"
                style={{position: "relative", zIndex: 1}}
              />
            </Box>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}

