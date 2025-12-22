"use client";

import "mantine-datatable/styles.layer.css";

import React, { useMemo, useState, type JSX } from "react";
import { Badge, Group, Text, ThemeIcon } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { DataTable, type DataTableColumn } from "mantine-datatable";
import type {
  ReferralRow,
  NormalizedReferral,
  ReferralsTableProps,
} from "@/utils/types/types";
import { pickStringValue } from "@/utils/helper";
import { REFERRALS_UI } from "@/utils/constants/constants";

const tableCopy = REFERRALS_UI.datatable;

const columns: DataTableColumn<NormalizedReferral>[] = [
  {
    accessor: "service",
    title: tableCopy.columns.service,
    render: ({ service }) => (
      <Group gap="sm">
        <ThemeIcon variant="light" color="blue" size="sm" radius="xl">
          <IconUsers size={12} />
        </ThemeIcon>
        <Text fw={500} size="sm" c="dark.6">
          {service}
        </Text>
      </Group>
    ),
  },
  {
    accessor: "email",
    title: tableCopy.columns.email,
    render: ({ email }) => (
      <Text size="sm" c="dimmed">
        {email}
      </Text>
    ),
  },
  {
    accessor: "dateText",
    title: tableCopy.columns.dateJoined,
    render: ({ dateText }) => (
      <Text size="sm" c="dimmed">
        {dateText}
      </Text>
    ),
  },
  {
    accessor: "status",
    title: tableCopy.columns.status,
    textAlign: "right",
    render: ({ status }) => (
      <Badge color="green" variant="light" size="sm">
        {status}
      </Badge>
    ),
  },
];

const normalizeReferrals = (records: ReferralRow[]): NormalizedReferral[] =>
  records.map((item) => {
    const id =
      pickStringValue(item, ["referral_id", "referrals_id", "id"]) ??
      Math.random().toString(36).slice(2, 9);

    const service =
      pickStringValue(item, [
        "referral_service_type",
        "referrals_service_type",
        "service_type",
      ]) ?? tableCopy.defaultService;

    const email =
      pickStringValue(item, [
        "referrals_referred_email",
        "referral_referred_email",
        "referral_referred_user_email",
        "referred_email",
      ]) ??
      (item.referral_referred_user_id
        ? `${tableCopy.userPrefix}${item.referral_referred_user_id}`
        : tableCopy.fallbackEmail);

    const dateValue =
      pickStringValue(item, [
        "referral_date_created",
        "referrals_date_created",
        "date_created",
        "created_at",
      ]) ?? null;

    const dateText = dateValue
      ? new Date(dateValue).toLocaleDateString()
      : tableCopy.fallbackDate;

    return {
      id,
      service,
      email,
      dateText,
      status: tableCopy.statusComplete,
    };
  });

export const ReferralsTable = ({
  records,
  loading = false,
}: ReferralsTableProps): JSX.Element => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const normalized = useMemo(() => normalizeReferrals(records), [records]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(normalized.length / pageSize)),
    [normalized.length, pageSize],
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = useMemo(
    () =>
      normalized.slice(
        (currentPage - 1) * pageSize,
        Math.min(currentPage * pageSize, normalized.length),
      ),
    [normalized, currentPage, pageSize],
  );

  return (
    <DataTable
      records={paginatedRecords}
      columns={columns}
      withTableBorder
      borderRadius="sm"
      withColumnBorders
      striped
      highlightOnHover
      minHeight={200}
      fetching={loading}
      totalRecords={normalized.length}
      page={currentPage}
      onPageChange={setPage}
      recordsPerPage={pageSize}
      recordsPerPageOptions={[5, 10, 20]}
      onRecordsPerPageChange={(value) => {
        setPageSize(value);
        setPage(1);
      }}
      noRecordsText={tableCopy.empty}
    />
  );
};
