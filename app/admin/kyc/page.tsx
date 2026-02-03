"use client";

import dynamic from "next/dynamic";
import { Container, Group, Text, Title } from "@mantine/core";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

const AdminUserKyc = dynamic(
  () => import("@/components/pages/admin/KycPage/AdminUserKyc"),
  { ssr: false },
);

export default function AdminKycPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
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
                KYC Verification
              </Title>
              <Text c="dark.3" size="sm" fw={500}>
                Review and manage user KYC submissions.
              </Text>
            </div>
          </Group>
          <AdminUserKyc />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
