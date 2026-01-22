"use client";
import {
  Container,
  Title,
  Center,
  Loader,
  Text,
  Group,
  Box,
} from "@mantine/core";
import dynamic from "next/dynamic";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

// Dynamic import for MailroomPackages to reduce initial bundle size
const MailroomPackages = dynamic(
  () => import("@/components/MailroomPackages"),
  {
    loading: () => (
      <Center h={400}>
        <Loader size="lg" color="violet" type="dots" />
      </Center>
    ),
    ssr: false, // Disable SSR since component uses useSearchParams
  },
);

export default function PackagesPage() {
  return (
    <PrivateMainLayout>
      <main
        style={{ flex: 1 }}
        role="main"
        aria-label="Packages management page"
      >
        <Container size="xl" py="xl">
          <Group
            justify="space-between"
            mb="xl"
            align="flex-end"
            w="100%"
            maw={1200}
          >
            <div>
              <Title order={1} fw={900} c="dark.5" lts="-0.02em">
                Packages Management
              </Title>
              <Text c="dark.3" size="sm" fw={500}>
                Track incoming deliveries, assign lockers, and manage releases.
              </Text>
            </div>
          </Group>

          {/* Reserve space to prevent layout shift */}
          <Box style={{ minHeight: "500px" }}>
            <MailroomPackages />
          </Box>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
