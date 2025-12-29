import { Box, Container, Paper, Stack, Text, Button } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import { ErrorProps } from "@/utils/types";

export default function MailroomError({ error }: ErrorProps) {
  return (
    <Box
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F8F9FA",
      }}
    >
      <DashboardNav />
      <Container py="xl" size="xl">
        <Paper p="xl" radius="md" withBorder>
          <Stack align="center">
            <Text c="red" size="lg" fw={500}>
              {error ?? "Not found"}
            </Text>
            <Link href="/dashboard">
              <Button leftSection={<IconArrowLeft size={16} />}>
                Back to Dashboard
              </Button>
            </Link>
          </Stack>
        </Paper>
      </Container>
      <Footer />
    </Box>
  );
}
