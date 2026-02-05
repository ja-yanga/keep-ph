"use client";

import { memo } from "react";
import { Box, Text, Group } from "@mantine/core";
import { IconUser } from "@tabler/icons-react";
import { type ActivityLogEntry, type ActivityLogDetails } from "@/utils/types";

export const LogDescription = memo(({ log }: { log: ActivityLogEntry }) => {
  const logAction = log.activity_action?.toLowerCase() || "performed an action";
  const entity =
    log.activity_entity_type?.toLowerCase().replace(/_/g, " ") || "something";

  const {
    package_name = "",
    package_type = "",
    package_locker_code = "",
    payment_method = "",
    payment_amount = "",
    kyc_description = "",
    mailroom_plan_name = "",
    mailroom_location_name = "",
    mailroom_locker_qty = "",
    email = "",
    provider = "",
    platform = "",
    method = "",
    update_type = "",
    new_role = "",
    previous_role = "",
  } = (log.activity_details as ActivityLogDetails) || {};

  return (
    <Box>
      <Text size="sm" fw={500} tt="capitalize" c="dark.7">
        {entity} {logAction.replace(/_/g, " ")}
      </Text>

      {(package_name ||
        (payment_amount && payment_method) ||
        kyc_description ||
        mailroom_plan_name ||
        email) && (
        <Box mt={2}>
          {email && !previous_role && (
            <Text size="xs" c="gray.7" lineClamp={1}>
              User: {email}
              {provider ? ` via ${provider}` : ""}
              {platform ? ` on ${platform}` : ""}
              {method ? ` (Method: ${method})` : ""}
              {update_type
                ? ` (Update: ${update_type.replace(/_/g, " ")})`
                : ""}
            </Text>
          )}

          {package_name && (
            <Text size="xs" c="gray.7" lineClamp={1}>
              {package_name} {package_type ? `(${package_type})` : "(Scanned)"}
              {package_locker_code && ` - Locker: ${package_locker_code}`}
            </Text>
          )}

          {payment_amount && payment_method && (
            <Text size="xs" c="gray.7" lineClamp={1} tt="uppercase">
              Amount: ₱{payment_amount} ({payment_method})
            </Text>
          )}

          {kyc_description && (
            <Text size="xs" c="gray.7" lineClamp={1}>
              {kyc_description}
            </Text>
          )}

          {mailroom_plan_name && (
            <Text size="xs" c="gray.7" lineClamp={1}>
              {mailroom_plan_name} - {mailroom_location_name} -{" "}
              {mailroom_locker_qty}
            </Text>
          )}

          {previous_role &&
            (() => {
              if (email && new_role && previous_role) {
                return (
                  <Text size="xs" c="gray.7" lineClamp={1}>
                    User {email} role has been changed to{" "}
                    {new_role.toUpperCase()} from {previous_role.toUpperCase()}
                  </Text>
                );
              }

              return null;
            })()}
        </Box>
      )}
    </Box>
  );
});

LogDescription.displayName = "LogDescription";

export const LogActor = memo(({ email }: { email: string | null }) => (
  <Group gap="xs" wrap="nowrap">
    <IconUser
      size={14}
      color="var(--mantine-color-dark-7)"
      aria-hidden="true"
    />
    <Text size="sm" fw={500} truncate c="dark.7">
      {email}
    </Text>
  </Group>
));

LogActor.displayName = "LogActor";
