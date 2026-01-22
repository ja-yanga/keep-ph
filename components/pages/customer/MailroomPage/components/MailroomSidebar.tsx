import {
  ActionIcon,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconCopy,
  IconCreditCard,
  IconMail,
  IconMapPin,
  IconPackage,
  IconScan,
  IconUser,
} from "@tabler/icons-react";
import {
  copyFullShippingAddress,
  getFullAddressFromRaw,
  getProp,
} from "../utils";
import { MailroomSidebarProps } from "@/utils/types";

export default function MailroomSidebar({
  src,
  fullNameValue,
  locations,
  plan,
  expiry,
}: MailroomSidebarProps) {
  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group mb="md">
          <ThemeIcon variant="light" color="indigo">
            <IconUser size={18} />
          </ThemeIcon>
          <Text fw={600}>User Details</Text>
        </Group>
        <Stack gap="sm">
          <Box>
            <Text size="xs" c="gray.8">
              Full Name
            </Text>
            <Text fw={500}>{String(fullNameValue ?? "—")}</Text>
          </Box>
          <Box>
            <Text size="xs" c="gray.8">
              Email
            </Text>
            <Text fw={500} style={{ wordBreak: "break-all" }}>
              {String(
                getProp<string>(src, "email") ??
                  (getProp<Record<string, unknown> | null>(src, "users_table")
                    ? getProp<string>(
                        getProp<Record<string, unknown> | null>(
                          src,
                          "users_table",
                        ) as Record<string, unknown>,
                        "users_email",
                      )
                    : undefined) ??
                  "—",
              )}
            </Text>
          </Box>
          <Group grow>
            <Box>
              <Text size="xs" c="gray.8">
                Mobile
              </Text>
              <Text fw={500}>
                {String(
                  getProp<string>(src, "mobile") ??
                    (getProp<Record<string, unknown> | null>(src, "users_table")
                      ? getProp<string>(
                          getProp<Record<string, unknown> | null>(
                            src,
                            "users_table",
                          ) as Record<string, unknown>,
                          "users_phone",
                        )
                      : undefined) ??
                    "—",
                )}
              </Text>
            </Box>
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group mb="md">
          <ThemeIcon variant="light" color="orange">
            <IconMapPin size={18} />
          </ThemeIcon>
          <Group>
            <Text fw={600}>Location Details</Text>
            <ActionIcon
              size="sm"
              variant="light"
              onClick={() => copyFullShippingAddress(src)}
              title="Copy full shipping address"
            >
              <IconCopy size={14} />
            </ActionIcon>
          </Group>
        </Group>
        <Stack gap="sm">
          <Box>
            <Text size="xs" c="gray.8">
              Mailroom Code
            </Text>
            <Text fw={500} ff="monospace">
              {String(
                getProp<string>(src, "mailroom_code") ??
                  getProp<string>(src, "mailroom_registration_code") ??
                  "—",
              )}
            </Text>
          </Box>
          <Box>
            <Text size="xs" c="gray.8">
              Location Name
            </Text>
            <Text fw={500}>
              {String(
                (locations &&
                  (locations as Record<string, unknown>)[
                    "mailroom_location_name"
                  ]) ??
                  (locations &&
                    (locations as Record<string, unknown>)["name"]) ??
                  "—",
              )}
            </Text>
          </Box>
          <Box>
            <Text size="xs" c="gray.8">
              Full Address
            </Text>
            <Text fw={500} size="sm" style={{ wordBreak: "break-word" }}>
              {(getFullAddressFromRaw(locations) ??
                [
                  (locations as Record<string, unknown>)?.address,
                  (locations as Record<string, unknown>)?.city,
                  (locations as Record<string, unknown>)?.region,
                ]
                  .filter(Boolean)
                  .join(", ")) ||
                "—"}
            </Text>
          </Box>
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group mb="md">
          <ThemeIcon variant="light" color="teal">
            <IconCreditCard size={18} />
          </ThemeIcon>
          <Text fw={600}>Plan Details</Text>
        </Group>
        <Stack gap="sm">
          <Box>
            <Text size="xs" c="gray.8">
              Plan Name
            </Text>
            <Text fw={500}>
              {String(
                (plan as Record<string, unknown>)?.mailroom_plan_name ??
                  (plan as Record<string, unknown>)?.name ??
                  getProp<string>(src, "plan") ??
                  "—",
              )}
            </Text>
          </Box>
          <Box>
            <Text size="xs" c="gray.8">
              Date Created
            </Text>
            <Text fw={500}>
              {getProp<string>(src, "created_at")
                ? new Date(
                    String(getProp<string>(src, "created_at")),
                  ).toLocaleDateString()
                : "—"}
            </Text>
          </Box>

          <Box>
            <Text size="xs" c="gray.8">
              Billing
            </Text>
            <Text fw={500}>
              {(() => {
                // prefer explicit subscription billing cycle if available
                const sub = getProp<Record<string, unknown> | null>(
                  src,
                  "subscription_table",
                );
                const cycle = sub
                  ? (sub["subscription_billing_cycle"] as string | undefined)
                  : undefined;
                if (cycle) {
                  return String(cycle).toUpperCase().includes("MONTH")
                    ? "Monthly"
                    : "Annual";
                }
                const monthsVal = getProp<string | number>(src, "months");
                if (!monthsVal) return "—";
                return Number(monthsVal) >= 12 ? "Annual" : "Monthly";
              })()}
            </Text>
          </Box>

          <Group grow>
            <Box>
              <Text size="xs" c="gray.8">
                Registration Location
              </Text>
              <Text fw={500}>
                {String(
                  (locations &&
                    (locations as Record<string, unknown>)[
                      "mailroom_location_name"
                    ]) ??
                    (locations &&
                      (locations as Record<string, unknown>)["name"]) ??
                    "—",
                )}
              </Text>
            </Box>
            <Box>
              <Text size="xs" c="gray.8">
                Expiry Date
              </Text>
              <Text fw={500}>
                {expiry ? new Date(expiry).toLocaleDateString() : "—"}
              </Text>
            </Box>
          </Group>

          {(Boolean(plan.can_receive_mail) ||
            Boolean(plan.can_receive_parcels) ||
            Boolean(plan.can_digitize)) && (
            <Box mt="xs">
              <Text size="xs" c="gray.8" mb={6}>
                Included Features
              </Text>
              <Group gap="xs">
                {Boolean(plan.can_receive_mail) && (
                  <Tooltip label="Can Receive Mail" withArrow>
                    <ThemeIcon
                      variant="light"
                      color="blue"
                      size="md"
                      radius="md"
                    >
                      <IconMail size={18} />
                    </ThemeIcon>
                  </Tooltip>
                )}
                {Boolean(plan.can_receive_parcels) && (
                  <Tooltip label="Can Receive Parcels" withArrow>
                    <ThemeIcon
                      variant="light"
                      color="orange"
                      size="md"
                      radius="md"
                    >
                      <IconPackage size={18} />
                    </ThemeIcon>
                  </Tooltip>
                )}
                {Boolean(plan.can_digitize) && (
                  <Tooltip label="Digital Scanning Included" withArrow>
                    <ThemeIcon
                      variant="light"
                      color="cyan"
                      size="md"
                      radius="md"
                    >
                      <IconScan size={18} />
                    </ThemeIcon>
                  </Tooltip>
                )}
              </Group>
            </Box>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
