"use client";

import { memo } from "react";
import { Badge, Text, Box } from "@mantine/core";

export const ErrorTypeBadge = memo(({ type }: { type: string }) => (
  <Badge variant="filled" size="md" color="#1a237e" radius="md">
    {type.replace(/_/g, " ")}
  </Badge>
));

ErrorTypeBadge.displayName = "ErrorTypeBadge";

export const ResolvedStatusBadge = memo(
  ({ resolved }: { resolved: boolean | null }) => (
    <Badge
      variant="filled"
      size="md"
      color={resolved ? "green" : "red"}
      radius="md"
    >
      {resolved ? "Resolved" : "Unresolved"}
    </Badge>
  ),
);

ResolvedStatusBadge.displayName = "ResolvedStatusBadge";

export const ErrorMessageCell = memo(({ message }: { message: string }) => (
  <Box>
    <Text size="sm" fw={500} c="dark.7" lineClamp={2}>
      {message}
    </Text>
  </Box>
));

ErrorMessageCell.displayName = "ErrorMessageCell";

export const RequestPathCell = memo(({ path }: { path?: string | null }) => (
  <Text size="sm" c="dark.7" lineClamp={1}>
    {path || "N/A"}
  </Text>
));

RequestPathCell.displayName = "RequestPathCell";

/** Short display labels for error_code so the table column doesn't overflow */
const ERROR_CODE_SHORT: Record<string, string> = {
  AUTH_401_UNAUTHORIZED: "401",
  AUTH_403_FORBIDDEN: "403",
  AUTH_TOKEN_EXPIRED: "Token expired",
  AUTH_TOKEN_INVALID: "Token invalid",
  AUTH_SESSION_NOT_FOUND: "No session",
  AUTH_USER_NOT_FOUND: "No user",
  AUTH_INVALID_CREDENTIALS: "Bad credentials",
  AUTH_EMAIL_NOT_VERIFIED: "Email unverified",
  DB_CONN_TIMEOUT: "DB timeout",
  DB_QUERY_ERROR: "DB error",
  DB_CONSTRAINT_VIOLATION: "Constraint",
  DB_FOREIGN_KEY_VIOLATION: "FK violation",
  DB_UNIQUE_VIOLATION: "Unique",
  DB_TRANSACTION_FAILED: "TX failed",
  DB_CONNECTION_LOST: "DB disconnected",
  VALIDATION_ERROR: "Validation",
  VALIDATION_FIELD_REQUIRED: "Invalid field",
  EXTERNAL_SERVICE_ERROR: "External API",
  PAYMENT_ERROR: "Payment",
  SYSTEM_ERROR: "System",
  API_ERROR: "API",
  UNKNOWN_ERROR: "Unknown",
};

const MAX_CODE_LENGTH = 14;

export function getErrorCodeDisplay(code?: string | null): string {
  if (!code) return "N/A";
  const mapped = ERROR_CODE_SHORT[code];
  if (mapped) return mapped;
  if (code.length <= MAX_CODE_LENGTH) return code;
  return `${code.slice(0, MAX_CODE_LENGTH - 1)}…`;
}

export const ErrorCodeCell = memo(({ code }: { code?: string | null }) => {
  const display = getErrorCodeDisplay(code);
  return (
    <Text size="sm" c="dark.7" title={code || undefined}>
      {display}
    </Text>
  );
});

ErrorCodeCell.displayName = "ErrorCodeCell";
