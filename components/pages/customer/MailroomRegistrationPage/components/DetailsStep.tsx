"use client";

import React from "react";
import {
  Stack,
  TextInput,
  Group,
  Text,
  Box,
  SimpleGrid,
  Paper,
  ThemeIcon,
} from "@mantine/core";
import { IconUser, IconMail, IconPhone } from "@tabler/icons-react";

type DetailsStepProps = {
  firstName: string;
  setFirstNameAction: (v: string) => void;
  lastName: string;
  setLastNameAction: (v: string) => void;
  email: string;
  setEmailAction: (v: string) => void;
  mobile: string;
  setMobileAction: (v: string) => void;
  mobileDisabled?: boolean;
  firstNameDisabled?: boolean;
  lastNameDisabled?: boolean;
  emailDisabled?: boolean;
};

export function DetailsStep({
  firstName,
  setFirstNameAction,
  lastName,
  setLastNameAction,
  email,
  setEmailAction,
  mobile,
  setMobileAction,
  mobileDisabled = false,
  firstNameDisabled = false,
  lastNameDisabled = false,
  emailDisabled = false,
}: DetailsStepProps) {
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {firstNameDisabled ? (
          <Paper
            withBorder
            p="sm"
            radius="md"
            bg="gray.0"
            style={{ borderStyle: "dashed" }}
          >
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon variant="light" color="gray" size="md">
                <IconUser size={18} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  First Name
                </Text>
                <Text fw={600} size="sm">
                  {firstName || "—"}
                </Text>
              </Box>
            </Group>
          </Paper>
        ) : (
          <TextInput
            label="First name"
            labelProps={{ fw: 700, size: "xs", tt: "uppercase", mb: 5 }}
            value={firstName}
            onChange={(e) => setFirstNameAction(e.target.value)}
            placeholder="First name"
            leftSection={<IconUser size={16} color="#adb5bd" />}
            radius="md"
          />
        )}

        {lastNameDisabled ? (
          <Paper
            withBorder
            p="sm"
            radius="md"
            bg="gray.0"
            style={{ borderStyle: "dashed" }}
          >
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon variant="light" color="gray" size="md">
                <IconUser size={18} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  Last Name
                </Text>
                <Text fw={600} size="sm">
                  {lastName || "—"}
                </Text>
              </Box>
            </Group>
          </Paper>
        ) : (
          <TextInput
            label="Last name"
            labelProps={{ fw: 700, size: "xs", tt: "uppercase", mb: 5 }}
            value={lastName}
            onChange={(e) => setLastNameAction(e.target.value)}
            placeholder="Last name"
            leftSection={<IconUser size={16} color="#adb5bd" />}
            radius="md"
          />
        )}
      </SimpleGrid>

      {emailDisabled ? (
        <Paper
          withBorder
          p="sm"
          radius="md"
          bg="gray.0"
          style={{ borderStyle: "dashed" }}
        >
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon variant="light" color="gray" size="md">
              <IconMail size={18} />
            </ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Email Address
              </Text>
              <Text fw={600} size="sm">
                {email || "—"}
              </Text>
            </Box>
          </Group>
        </Paper>
      ) : (
        <TextInput
          label="Email"
          labelProps={{ fw: 700, size: "xs", tt: "uppercase", mb: 5 }}
          value={email}
          onChange={(e) => setEmailAction(e.target.value)}
          placeholder="you@example.com"
          leftSection={<IconMail size={16} color="#adb5bd" />}
          radius="md"
        />
      )}

      {mobileDisabled ? (
        <Paper
          withBorder
          p="sm"
          radius="md"
          bg="gray.0"
          style={{ borderStyle: "dashed" }}
        >
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon variant="light" color="gray" size="md">
              <IconPhone size={18} />
            </ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Mobile Number
              </Text>
              <Text fw={600} size="sm">
                {mobile || "—"}
              </Text>
            </Box>
          </Group>
        </Paper>
      ) : (
        <TextInput
          label="Mobile Number"
          labelProps={{ fw: 700, size: "xs", tt: "uppercase", mb: 5 }}
          placeholder="09XXXXXXXXX"
          value={mobile}
          onChange={(e) =>
            setMobileAction(e.target.value.replace(/\D/g, "").slice(0, 11))
          }
          leftSection={<IconPhone size={16} color="#adb5bd" />}
          required
          withAsterisk
          radius="md"
        />
      )}
    </Stack>
  );
}
