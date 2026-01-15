"use client";

import {
  Container,
  Stack,
  Title,
  Text,
  SimpleGrid,
  ThemeIcon,
  Paper,
  Box,
} from "@mantine/core";
import PublicMainLayout from "@/components/Layout/PublicMainLayout";
import HeroSection from "@/components/HeroSection";
import dynamic from "next/dynamic";
const PricingSection = dynamic(() => import("@/components/PricingSection"), {
  ssr: false,
  loading: () => null,
});

// inline SVG icons to avoid importing the whole icon library (smaller client bundle)
const IconMail = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M3 8.5v7A2.5 2.5 0 0 0 5.5 18h13a2.5 2.5 0 0 0 2.5-2.5v-7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 7l8 5 8-5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconTruck = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M1 10h13v6H1z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 10h5l3 4v2h-8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="6.5" cy="18.5" r="1.5" fill="currentColor" />
    <circle cx="18.5" cy="18.5" r="1.5" fill="currentColor" />
  </svg>
);
const IconBuilding = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect
      x="3"
      y="3"
      width="14"
      height="18"
      stroke="currentColor"
      strokeWidth="1.5"
      rx="1"
    />
    <path
      d="M7 7h4M7 11h4M7 15h4"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="19"
      y="8"
      width="2"
      height="10"
      rx="0.5"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

// move feature data to module scope so it's not re-created each render
const FEATURES = [
  {
    icon: IconMail,
    title: "Digital Mail Scanning",
    desc: "Receive your mail online. We scan the exterior and contents (on request) so you can access it securely from anywhere.",
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
    desc: "Establish a professional presence with a prestigious business address in a prime location — perfect for startups and freelancers.",
    color: "indigo",
  },
];

export default function Home() {
  return (
    <PublicMainLayout>
      <Box component="main" style={{ flex: 1 }}>
        <HeroSection />

        {/* SERVICES SECTION */}
        <Container size="xl" py={{ base: 40, md: 80 }} id="services">
          <Stack align="center" gap="sm" mb={{ base: 30, md: 60 }}>
            <Title
              order={2}
              // TBT FIX: Use object syntax for sizes instead of JS ternary
              size="h2"
              c="#1A237E"
              ta="center"
              style={{
                letterSpacing: "-0.02em",
                fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
              }}
            >
              Everything You Need to Go Virtual
            </Title>
            <Text
              ta="center"
              size="lg"
              maw={700}
              // TBT FIX: Static color string or high-contrast slate
              style={{ color: "#4A5568" }}
            >
              From a simple mail dropbox to a complete virtual office,
              we&apos;ve got a solution for you.
            </Text>
          </Stack>

          <SimpleGrid
            cols={{ base: 1, sm: 2, md: 3 }}
            spacing={{ base: 20, md: 30 }}
          >
            {FEATURES.map((feature, index) => (
              <Paper
                key={index}
                radius="lg"
                p="xl"
                withBorder
                className="feature-card"
                style={{
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  cursor: "default",
                }}
              >
                <Stack className="feature-stack" gap="md">
                  <ThemeIcon
                    className="feature-icon"
                    radius="md"
                    variant="light"
                    color={feature.color}
                  >
                    <feature.icon size={30} />
                  </ThemeIcon>

                  <Title
                    order={3}
                    size={22}
                    className="feature-title"
                    c="#1A237E"
                  >
                    {feature.title}
                  </Title>

                  <Text
                    className="feature-desc"
                    size="sm"
                    style={{ lineHeight: 1.6, color: "#4A5568" }}
                  >
                    {feature.desc}
                  </Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>

        <PricingSection />

        {/* CSS-Native Responsiveness to kill TBT */}
        <style jsx>{`
          .feature-card:hover {
            transform: translateY(-8px);
            box-shadow: var(--mantine-shadow-xl);
          }

          .feature-stack {
            align-items: flex-start;
          }
          .feature-title,
          .feature-desc {
            text-align: left;
          }
          .feature-icon {
            width: 64px;
            height: 64px;
          }

          @media (max-width: 48em) {
            .feature-stack {
              align-items: center;
            }
            .feature-title,
            .feature-desc {
              text-align: center;
            }
            .feature-icon {
              width: 54px;
              height: 54px;
            }
            .feature-card:hover {
              transform: none;
            }
          }
        `}</style>
      </Box>
    </PublicMainLayout>
  );
}
