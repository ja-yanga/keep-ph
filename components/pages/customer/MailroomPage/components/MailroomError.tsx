import { Container, Paper, Stack, Text, Button } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { ErrorProps } from "@/utils/types";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function MailroomError({ error }: ErrorProps) {
  return (
    <PrivateMainLayout>
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
    </PrivateMainLayout>
  );
}
