"use client";

import {
  Container,
  Stack,
  Title,
  Text,
  SimpleGrid,
  ThemeIcon,
  Paper,
} from "@mantine/core";
import { IconMail, IconTruck, IconBuilding } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import HeroSection from "@/components/HeroSection";
import PricingSection from "@/components/PricingSection";
import PublicMainLayout from "@/components/Layout/PublicMainLayout";

export default function Home() {
  const isMobile = useMediaQuery("(max-width: 48em)");

  const features = [
    {
      icon: IconMail,
      title: "Digital Mail Scanning",
      desc: "Receive your mail online. We scan the exterior and contents (on your request) so you can access it securely from anywhere.",
      color: "blue",
    },
    {
      icon: IconTruck,
      title: "Mail Transfer & Forwarding",
      desc: "Need the physical copy? We'll forward your mail and packages to any address in the world, quickly and reliably.",
      color: "orange",
    },
    {
      icon: IconBuilding,
      title: "Virtual Office Addresses",
      desc: "Establish a professional presence with a prestigious business address in a prime location. Perfect for startups and freelancers.",
      color: "indigo",
    },
  ];

  return (
    <PublicMainLayout>
      <main style={{ flex: 1 }}>
        <HeroSection />

        {/* SERVICES SECTION */}
        <Container size="xl" py={{ base: 40, md: 80 }} id="services">
          <Stack align="center" gap="sm" mb={{ base: 30, md: 60 }}>
            <Title
              order={2}
              size={isMobile ? 28 : 36}
              c="#1A237E"
              ta="center"
              style={{ letterSpacing: "-0.02em" }}
            >
              Everything You Need to Go Virtual
            </Title>
            <Text
              c="dimmed"
              ta="center"
              size={isMobile ? "md" : "lg"}
              maw={700}
            >
              From a simple mail dropbox to a complete virtual office,
              we&apos;ve got a solution for you.
            </Text>
          </Stack>

          <SimpleGrid
            cols={{ base: 1, sm: 2, md: 3 }}
            spacing={{ base: 20, md: 30 }}
          >
            {features.map((feature, index) => (
              <Paper
                key={index}
                radius="lg" // Increased radius for a modern look
                p="xl"
                withBorder
                style={{
                  transition: "all 0.3s ease",
                  cursor: "default",
                  // Hover effects only for desktop
                  "&:hover": !isMobile
                    ? {
                        transform: "translateY(-8px)",
                        boxShadow: "var(--mantine-shadow-xl)",
                        borderColor: "var(--mantine-color-blue-outline)",
                      }
                    : {},
                }}
              >
                <Stack align={isMobile ? "center" : "flex-start"} gap="md">
                  <ThemeIcon
                    size={isMobile ? 54 : 64}
                    radius="md"
                    variant="light"
                    color={feature.color}
                  >
                    <feature.icon size={isMobile ? 28 : 32} />
                  </ThemeIcon>

                  <Title
                    order={3}
                    size={22}
                    ta={isMobile ? "center" : "left"}
                    c="#1A237E"
                  >
                    {feature.title}
                  </Title>

                  <Text
                    c="dimmed"
                    ta={isMobile ? "center" : "left"}
                    style={{ lineHeight: 1.6 }}
                    size="sm"
                  >
                    {feature.desc}
                  </Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>

        <PricingSection />
      </main>
    </PublicMainLayout>
  );
}
