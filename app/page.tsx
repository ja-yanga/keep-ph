import {
  Container,
  Stack,
  Title,
  Text,
  Box,
  SimpleGrid,
  ThemeIcon,
  Paper,
  rem,
} from "@mantine/core";
import {IconMail, IconTruck, IconBuilding} from "@tabler/icons-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import PricingSection from "@/components/PricingSection";

export default function Home() {
  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#F8F9FA",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <Nav />

      <main style={{flex: 1}}>
        <HeroSection />

        {/* SERVICES SECTION */}
        <Container size="xl" py={80} id="services">
          <Stack align="center" gap="sm" mb={60}>
            <Title order={2} size={36} c="#1A237E">
              Everything You Need to Go Virtual
            </Title>
            <Text c="dimmed" ta="center" size="lg" maw={700}>
              From a simple mail dropbox to a complete virtual office, we've got
              a solution for you.
            </Text>
          </Stack>

          <SimpleGrid cols={{base: 1, md: 3}} spacing={30}>
            {[
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
            ].map((feature, index) => (
              <Paper
                key={index}
                radius="md"
                p="xl"
                withBorder
                style={{
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  cursor: "default",
                }}
              >
                <Stack align="flex-start" gap="md">
                  <ThemeIcon
                    size={60}
                    radius="md"
                    variant="light"
                    color={feature.color}
                  >
                    <feature.icon size={32} />
                  </ThemeIcon>
                  <Title order={3} size={22}>
                    {feature.title}
                  </Title>
                  <Text c="dimmed" style={{lineHeight: 1.6}}>
                    {feature.desc}
                  </Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>

        <PricingSection />
      </main>

      <Footer />
    </Box>
  );
}
