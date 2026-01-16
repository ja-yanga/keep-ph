"use client";

import { Box, Container, Title, Paper, Tabs } from "@mantine/core";
import { IconUser, IconLock, IconMapPin } from "@tabler/icons-react";
import ProfileTab from "./ProfileTab";
import AccountAddressesTab from "./AddressesTab";
import SecurityTab from "./SecurityTab";

export default function AccountSettings() {
  return (
    <Box component="main" style={{ flex: 1 }} py="xl">
      <Container size="md">
        <Title order={2} mb="lg" c="dark.8">
          Account Settings
        </Title>

        <Paper withBorder radius="md" shadow="sm" p="md">
          <Tabs defaultValue="profile" orientation="horizontal">
            <Tabs.List mb="lg">
              <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
                Profile
              </Tabs.Tab>

              <Tabs.Tab
                value="addresses"
                leftSection={<IconMapPin size={16} />}
              >
                Addresses
              </Tabs.Tab>

              <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>
                Security
              </Tabs.Tab>
            </Tabs.List>

            {/* --- PROFILE TAB --- */}
            <Tabs.Panel value="profile">
              <ProfileTab />
            </Tabs.Panel>

            {/* --- ADDRESSES TAB --- */}
            <Tabs.Panel value="addresses">
              <AccountAddressesTab />
            </Tabs.Panel>

            {/* --- SECURITY TAB --- */}
            <Tabs.Panel value="security">
              <SecurityTab />
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Container>
    </Box>
  );
}
