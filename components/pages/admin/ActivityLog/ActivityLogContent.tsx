"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Stack,
  Group,
  TextInput,
  Select,
  Button,
  Paper,
  Text,
  Badge,
} from "@mantine/core";
import { IconSearch, IconRefresh, IconUser } from "@tabler/icons-react";
import { AdminTable } from "@/components/common/AdminTable";
import { formatDate } from "@/utils/format";
import {
  type ActivityLogEntry,
  type AdminListActivityLogsResult,
} from "@/utils/types";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const ENTITY_TYPES = [
  { label: "All Entities", value: "" },
  { label: "Mail Action Request", value: "MAIL_ACTION_REQUEST" },
  { label: "User KYC", value: "USER_KYC" },
  { label: "Payment Transaction", value: "PAYMENT_TRANSACTION" },
  { label: "Subscription", value: "SUBSCRIPTION" },
  { label: "Mailbox Item", value: "MAILBOX_ITEM" },
  { label: "Mailroom Registration", value: "MAILROOM_REGISTRATION" },
  { label: "User Address", value: "USER_ADDRESS" },
  { label: "Rewards Claim", value: "REWARDS_CLAIM" },
  { label: "Referral", value: "REFERRAL" },
  { label: "Notification", value: "NOTIFICATION" },
  { label: "Mailroom File", value: "MAILROOM_FILE" },
  { label: "Mailroom Assigned Locker", value: "MAILROOM_ASSIGNED_LOCKER" },
  { label: "User", value: "USER" },
];

const ACTIONS = [
  { label: "All Actions", value: "" },
  { label: "Create", value: "CREATE" },
  { label: "Update", value: "UPDATE" },
  { label: "Delete", value: "DELETE" },
  { label: "View", value: "VIEW" },
  { label: "Submit", value: "SUBMIT" },
  { label: "Approve", value: "APPROVE" },
  { label: "Reject", value: "REJECT" },
  { label: "Process", value: "PROCESS" },
  { label: "Complete", value: "COMPLETE" },
  { label: "Cancel", value: "CANCEL" },
  { label: "Verify", value: "VERIFY" },
  { label: "Pay", value: "PAY" },
  { label: "Refund", value: "REFUND" },
  { label: "Login", value: "LOGIN" },
  { label: "Logout", value: "LOGOUT" },
  { label: "Register", value: "REGISTER" },
  { label: "Claim", value: "CLAIM" },
  { label: "Release", value: "RELEASE" },
  { label: "Dispose", value: "DISPOSE" },
  { label: "Scan", value: "SCAN" },
  { label: "Purchase", value: "PURCHASE" },
];

export default function ActivityLogContent() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const recordsPerPage = 10;

  // Filters
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([
    null,
    null,
  ]);

  // Sorting
  const [sortStatus, setSortStatus] = useState<{
    columnAccessor: string;
    direction: "asc" | "desc";
  }>({ columnAccessor: "activity_created_at", direction: "desc" });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_activity_logs", {
        input_data: {
          limit: recordsPerPage,
          offset: (page - 1) * recordsPerPage,
          search: search || null,
          entity_type: entityType || null,
          action: action || null,
          date_from: dateRange[0] || null,
          date_to: dateRange[1] || null,
          sort_by: sortStatus.columnAccessor || null,
          sort_direction: sortStatus.direction || null,
        },
      });

      if (error) throw error;

      if (data) {
        const result = data as unknown as AdminListActivityLogsResult;
        setLogs(result.logs || []);
        setTotalRecords(result.total_count || 0);
      }
    } catch (err) {
      const errorObj = err as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };
      console.error("Error fetching activity logs:", {
        message: errorObj.message,
        details: errorObj.details,
        hint: errorObj.hint,
        code: errorObj.code,
        full: err,
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, entityType, action, dateRange, sortStatus]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const generateDescription = (log: ActivityLogEntry) => {
    const logAction =
      log.activity_action?.toLowerCase() || "performed an action";
    const entity =
      log.activity_entity_type?.toLowerCase().replace(/_/g, " ") || "something";

    // For mailbox items (store, dispose, release, scan)
    const package_name = log.activity_details?.package_name || "";
    const package_type = log.activity_details?.package_type || "";
    const package_locker_code = log.activity_details?.package_locker_code || "";

    // For rewards
    const payment_method = log.activity_details?.payment_method || "";
    const payment_amount = log.activity_details?.payment_amount || "";

    // For KYC
    const kyc_description = log.activity_details?.kyc_description || "";

    // For subscription
    const subscription_plan_name =
      log.activity_details?.mailroom_plan_name || "";
    const subscription_location_name =
      log.activity_details?.mailroom_location_name || "";
    const subscription_locker_qty =
      log.activity_details?.mailroom_locker_qty || "";

    return (
      <Stack gap={2}>
        {/* Main action description */}
        <Text size="sm" fw={500} tt="capitalize">
          {logAction} {entity}
        </Text>

        {/* For mailbox items: show package name and type */}
        {package_name && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {package_name} {package_type ? `(${package_type})` : "(Scanned)"}
            {package_locker_code && ` - Locker: ${package_locker_code}`}
          </Text>
        )}

        {/* For rewards: show payout and payment method */}
        {payment_amount && payment_method && (
          <Text size="xs" c="dimmed" lineClamp={1} tt="uppercase">
            Amount: ₱{payment_amount} ({payment_method})
          </Text>
        )}

        {/* For KYC: show description */}
        {kyc_description && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {kyc_description}
          </Text>
        )}

        {/* For subscription: show description */}
        {subscription_plan_name && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {subscription_plan_name} - {subscription_location_name} -{" "}
            {subscription_locker_qty}
          </Text>
        )}
      </Stack>
    );
  };

  return (
    <Container fluid>
      <Stack gap="xs">
        <Paper p="md" withBorder shadow="sm" radius="md">
          <Stack gap="md">
            {/* First row: Search, Entity Type, Action */}
            <Group align="flex-end" grow preventGrowOverflow={false}>
              <TextInput
                label="Search"
                placeholder="Search by details or email..."
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ minWidth: 0 }}
              />
              <Select
                label="Entity Type"
                placeholder="Pick one"
                data={ENTITY_TYPES}
                value={entityType}
                onChange={setEntityType}
                clearable
                style={{ minWidth: 0 }}
              />
              <Select
                label="Action"
                placeholder="Pick one"
                data={ACTIONS}
                value={action}
                onChange={setAction}
                clearable
                style={{ minWidth: 0 }}
              />
            </Group>

            {/* Second row: Date filters and Refresh button */}
            <Group align="flex-end" wrap="wrap">
              <TextInput
                label="From Date"
                type="date"
                placeholder="Pick date"
                value={dateRange[0] || ""}
                onChange={(e) =>
                  setDateRange([e.currentTarget.value || null, dateRange[1]])
                }
                style={{ flex: "1 1 200px", minWidth: "200px" }}
              />
              <TextInput
                label="To Date"
                type="date"
                placeholder="Pick date"
                value={dateRange[1] || ""}
                onChange={(e) =>
                  setDateRange([dateRange[0], e.currentTarget.value || null])
                }
                style={{ flex: "1 1 200px", minWidth: "200px" }}
              />
              <Button
                variant="default"
                leftSection={<IconRefresh size={16} aria-hidden="true" />}
                onClick={() => fetchLogs()}
                loading={loading}
                size="sm"
                aria-label="Refresh activity logs"
                style={{ flex: "0 0 auto" }}
              >
                Refresh
              </Button>
            </Group>
          </Stack>
        </Paper>

        <AdminTable<ActivityLogEntry>
          fetching={loading}
          records={logs}
          idAccessor="activity_log_id"
          totalRecords={totalRecords}
          recordsPerPage={recordsPerPage}
          page={page}
          onPageChange={setPage}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            {
              accessor: "activity_created_at",
              title: "Timestamp",
              width: 180,
              sortable: true,
              render: (log) => formatDate(log.activity_created_at),
            },
            {
              accessor: "actor_email",
              title: "Actor",
              width: 250,
              sortable: true,
              render: (log) => (
                <Group gap="xs">
                  <IconUser size={14} color="gray" />
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>
                      {log.actor_email}
                    </Text>
                  </Stack>
                </Group>
              ),
            },
            {
              accessor: "activity_entity_type",
              title: "Entity Type",
              width: 200,
              sortable: true,
              render: (log) => (
                <Badge variant="dot" color="blue">
                  {log.activity_entity_type?.replaceAll("_", " ") || "N/A"}
                </Badge>
              ),
            },
            {
              accessor: "description",
              title: "Description",
              render: (log) => generateDescription(log),
            },
            {
              accessor: "activity_action",
              title: "Action",
              width: 120,
              sortable: true,
              render: (log) => (
                <Badge variant="dot" color="blue">
                  {log.activity_action}
                </Badge>
              ),
            },
            // {
            //   accessor: "context",
            //   title: "Context",
            //   width: 150,
            //   render: (log) => (
            //     <Tooltip
            //       label={`IP: ${log.activity_ip_address || "N/A"}\nUA: ${log.activity_user_agent || "N/A"}`}
            //     >
            //       <Stack gap={0}>
            //         <Text size="sm" c="dimmed">
            //           {log.activity_ip_address || "No IP"}
            //         </Text>
            //         <Text size="xs" c="dimmed" truncate>
            //           {log.activity_user_agent || "No UA"}
            //         </Text>
            //       </Stack>
            //     </Tooltip>
            //   ),
            // },
          ]}
        />
      </Stack>
    </Container>
  );
}
