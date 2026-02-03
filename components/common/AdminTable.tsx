"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Stack, Skeleton } from "@mantine/core";
import { type DataTableProps } from "mantine-datatable";
import { minTableHeight } from "@/utils/helper";

export type AdminTableProps<T> = DataTableProps<T>;

const DataTableDynamic = dynamic(
  () => import("mantine-datatable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => (
      <Stack gap="md" p="xl">
        {/* Header skeleton */}
        <Skeleton height={40} radius="md" />
        {/* Row skeletons - 10 rows to match default recordsPerPage */}
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} height={60} radius="md" />
        ))}
      </Stack>
    ),
  },
);

export function AdminTable<T>(props: AdminTableProps<T>) {
  const recordsPerPage = props.recordsPerPage ?? 10;
  const minHeight = props.minHeight ?? minTableHeight(recordsPerPage);

  const DataTableComp = DataTableDynamic as unknown as <U>(
    p: DataTableProps<U>,
  ) => React.ReactElement;

  const finalProps = {
    withTableBorder: false,
    striped: true,
    highlightOnHover: true,
    verticalSpacing: "md" as const,
    ...props,
    minHeight,
    ...(props.totalRecords !== undefined ? { recordsPerPage } : {}),
  } as DataTableProps<T>;

  return <DataTableComp<T> {...finalProps} />;
}
