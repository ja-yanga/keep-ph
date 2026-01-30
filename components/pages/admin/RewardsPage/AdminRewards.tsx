"use client";

import "mantine-datatable/styles.layer.css";

import React, { useEffect, useState, Suspense, useMemo } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  TextInput,
  Text,
  Center,
  Loader,
  FileInput,
  Tabs,
  Card,
  Divider,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconSearch,
  IconCheck,
  IconArrowRight,
  IconUpload,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import Image from "next/image";
import type { AdminClaimApprove, ConfirmTarget } from "@/utils/types";
import { getStatusFormat, maskAccount } from "@/utils/helper";
import { type DataTableSortStatus } from "mantine-datatable";
import { AdminTable } from "@/components/common/AdminTable";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ClaimStatus = "PENDING" | "PROCESSING" | "PAID";

// Mobile card component for better UX
function ClaimCard({
  claim,
  revealed,
  onToggleReveal,
  onAction,
  loading,
}: {
  claim: AdminClaimApprove;
  revealed: boolean;
  onToggleReveal: () => void;
  onAction: () => void;
  loading: boolean;
}) {
  const statusColor = getStatusFormat(claim.status);

  const getButtonColor = () => {
    if (claim.status === "PENDING") return "blue";
    if (claim.status === "PROCESSING") return "green";
    return "gray";
  };

  const getButtonIcon = () => {
    if (claim.status === "PENDING") return <IconUpload size={16} />;
    if (claim.status === "PROCESSING") return <IconCheck size={16} />;
    return <IconEye size={16} />;
  };

  const getButtonText = () => {
    if (claim.status === "PENDING") return "Upload Proof";
    if (claim.status === "PROCESSING") return "Mark Paid";
    return "View Proof";
  };

  return (
    <Card withBorder shadow="sm" p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              Claim ID
            </Text>
            <Text fw={600} size="xs">
              {String(claim.id).slice(0, 8)}
            </Text>
          </Stack>
          <Badge color={`${statusColor}.9`} variant="filled" size="sm">
            {claim.status}
          </Badge>
        </Group>

        <Divider />

        <Stack gap={8}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              User
            </Text>
            <Text size="xs" fw={500} lineClamp={1}>
              {claim.user?.users_email ?? claim.user?.email ?? claim.user_id}
            </Text>
          </Group>

          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Amount
            </Text>
            <Text size="xs" fw={700}>
              ₱{claim.amount ?? "—"}
            </Text>
          </Group>

          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Claim Ref / Total Ref
            </Text>
            <Text size="xs">
              {claim.referral_count ?? "—"} / {claim.total_referrals ?? "—"}
            </Text>
          </Group>

          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Method
            </Text>
            <Text size="xs" fw={600} tt="uppercase">
              {claim.payment_method ?? "—"}
            </Text>
          </Group>

          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              Account
            </Text>
            <Group gap={4} align="center" wrap="nowrap">
              <Text
                size="xs"
                style={{
                  wordBreak: "break-all",
                  flex: 1,
                  fontFamily: "monospace",
                }}
              >
                {revealed
                  ? (claim.account_details ?? "—")
                  : maskAccount(claim.account_details)}
              </Text>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={onToggleReveal}
                aria-label={revealed ? "Hide account" : "Show account"}
                style={{ flexShrink: 0 }}
              >
                {revealed ? <IconEyeOff size={14} /> : <IconEye size={14} />}
              </ActionIcon>
            </Group>
          </Stack>

          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Requested
            </Text>
            <Text size="xs">
              {claim.created_at
                ? new Date(claim.created_at).toLocaleDateString()
                : "—"}
            </Text>
          </Group>
        </Stack>

        <Button
          fullWidth
          size="sm"
          onClick={onAction}
          loading={loading}
          color={getButtonColor()}
          leftSection={getButtonIcon()}
        >
          {getButtonText()}
        </Button>
      </Stack>
    </Card>
  );
}

export default function AdminRewards() {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const toggleReveal = (id: string) =>
    setRevealed((s) => ({ ...s, [id]: !s[id] }));

  const isMobile = useMediaQuery("(max-width: 768px)");

  const { data, error, isValidating } = useSWR("/api/admin/rewards", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [activeTab, setActiveTab] = useState<ClaimStatus>("PENDING");
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<AdminClaimApprove>
  >({
    columnAccessor: "created_at",
    direction: "desc",
  });

  const [proofOpen, setProofOpen] = useState(false);
  const [proofTargetRow, setProofTargetRow] =
    useState<AdminClaimApprove | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [viewProofOpen, setViewProofOpen] = useState(false);
  const [viewProofRow, setViewProofRow] = useState<AdminClaimApprove | null>(
    null,
  );

  const claims: AdminClaimApprove[] = Array.isArray(data)
    ? (data as AdminClaimApprove[])
    : [];

  useEffect(() => {
    if (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load claims",
        color: "red",
      });
    }
  }, [error]);

  useEffect(() => {
    if (globalSuccess) {
      const t = setTimeout(() => setGlobalSuccess(null), 4500);
      return () => clearTimeout(t);
    }
  }, [globalSuccess]);

  const triggerEmail = async (
    to: string,
    template: string,
    data: Record<string, string | number | boolean>,
  ) => {
    try {
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, template, data }),
      }).catch((err) => console.error("Async email error:", err));
    } catch (err) {
      console.error("Email trigger failed:", err);
    }
  };

  const doUpdate = async (id: string, status: "PROCESSING" | "PAID") => {
    setLoadingAction(id);
    try {
      const res = await fetch(`/api/admin/rewards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const parsed = await res.json().catch(() => null);
        const msg = parsed?.error ?? `Failed to update (status ${res.status})`;
        throw new Error(String(msg));
      }

      if (status === "PAID") {
        const row = claims.find((c) => c.id === id);
        const email = row?.user?.users_email || row?.user?.email;
        if (email) {
          triggerEmail(email, "REWARD_PAID", {
            recipientName: email,
            amount: row?.amount ?? 0,
            paymentMethod: row?.payment_method ?? "N/A",
          });
        }
      }

      setGlobalSuccess(`Claim marked ${status}`);
      await swrMutate("/api/admin/rewards");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV === "development") {
        console.error(message);
      }
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setLoadingAction(null);
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  const handleUploadAndMarkPaid = async () => {
    if (!proofTargetRow) return;
    setUploading(true);
    try {
      if (!proofFile) {
        throw new Error("Please select a file to upload");
      }

      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (proofFile.size > MAX_FILE_SIZE) {
        throw new Error(
          `File size exceeds 5MB limit (${(proofFile.size / (1024 * 1024)).toFixed(2)}MB)`,
        );
      }

      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
      ];
      if (!validTypes.includes(proofFile.type)) {
        throw new Error(
          `Invalid file type: ${proofFile.type}. Please upload an image or PDF.`,
        );
      }

      const proof_base64 = await new Promise<string | null>((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = (error) => {
          console.error("File read error:", error);
          resolve(null);
        };
        fr.readAsDataURL(proofFile);
      });

      if (!proof_base64) {
        throw new Error("Failed to read file");
      }

      const res = await fetch(`/api/admin/rewards/${proofTargetRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          proof_base64,
        }),
      });

      const responseClone = res.clone();
      let json: Record<string, unknown> | null = null;
      let responseText = "";

      try {
        json = await res.json();
      } catch {
        responseText = await responseClone.text().catch(() => "");
      }

      if (!res.ok) {
        const errorMessage = json?.error
          ? String(json.error)
          : responseText ||
            `Failed to upload proof (${res.status}: ${res.statusText})`;
        throw new Error(errorMessage);
      }

      notifications.show({
        title: "Marked Paid",
        message: "Claim marked PAID.",
        color: "green",
      });

      const email =
        proofTargetRow.user?.users_email || proofTargetRow.user?.email;
      if (email) {
        triggerEmail(email, "REWARD_PAID", {
          recipientName: email,
          amount: proofTargetRow.amount ?? 0,
          paymentMethod: proofTargetRow.payment_method ?? "N/A",
        });
      }

      await swrMutate("/api/admin/rewards");

      setProofOpen(false);
      setProofTargetRow(null);
      setProofFile(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

  const statusCounts = useMemo(() => {
    return {
      PENDING: claims.filter((c) => c.status === "PENDING").length,
      PROCESSING: claims.filter((c) => c.status === "PROCESSING").length,
      PAID: claims.filter((c) => c.status === "PAID").length,
    };
  }, [claims]);

  const filtered = useMemo(() => {
    const subset = claims.filter((c) => {
      if (c.status !== activeTab) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      const fields = [
        c.id,
        c.user?.email,
        c.user?.users_email,
        String(c.referral_count ?? ""),
        c.payment_method,
        c.account_details,
        c.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(q);
    });

    return [...subset].sort((a, b) => {
      const { columnAccessor, direction } = sortStatus;
      let valA: string | number | boolean | null | undefined;
      let valB: string | number | boolean | null | undefined;

      if (columnAccessor === "user") {
        valA = a.user?.users_email || a.user?.email || a.user_id;
        valB = b.user?.users_email || b.user?.email || b.user_id;
      } else {
        valA = a[columnAccessor as keyof AdminClaimApprove] as
          | string
          | number
          | boolean
          | null
          | undefined;
        valB = b[columnAccessor as keyof AdminClaimApprove] as
          | string
          | number
          | boolean
          | null
          | undefined;
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const result = valA < valB ? -1 : 1;
      return direction === "asc" ? result : -result;
    });
  }, [claims, activeTab, search, sortStatus]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  if (isValidating)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );

  let viewProofContent: React.ReactNode = (
    <Text c="#2D3748" id="view-proof-modal-description">
      No proof available for this claim.
    </Text>
  );
  if (viewProofRow?.proof_url) {
    if (viewProofRow.proof_url.endsWith(".pdf")) {
      viewProofContent = (
        <iframe
          src={viewProofRow.proof_url}
          title="Proof of payment PDF document"
          style={{ width: "100%", height: "60vh", border: "none" }}
          aria-label="Proof of payment document"
          loading="lazy"
        />
      );
    } else {
      viewProofContent = (
        <div
          style={{
            width: "100%",
            height: "70vh",
            position: "relative",
            borderRadius: 8,
            overflow: "hidden",
          }}
          role="img"
          aria-label="Proof of payment image"
        >
          <Image
            src={viewProofRow.proof_url}
            alt="Proof of payment"
            fill
            style={{ objectFit: "contain", borderRadius: 8 }}
            unoptimized
            priority={false}
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
          />
        </div>
      );
    }
  }

  return (
    <Stack align="center" w="100%" gap="lg">
      {globalSuccess && (
        <Alert
          variant="light"
          color="green"
          title="Success"
          icon={<IconCheck size={16} />}
          withCloseButton
          onClose={() => setGlobalSuccess(null)}
          w="100%"
        >
          {globalSuccess}
        </Alert>
      )}

      <Paper
        p={isMobile ? "md" : "xl"}
        radius="lg"
        withBorder
        shadow="sm"
        w="100%"
      >
        <Stack gap="md" mb="md">
          <TextInput
            placeholder="Search claims..."
            leftSection={<IconSearch size={16} aria-hidden="true" />}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
            aria-label="Search reward claims"
          />

          <Tabs
            value={activeTab}
            onChange={(value) => {
              setActiveTab((value as ClaimStatus) || "PENDING");
              setPage(1);
            }}
            keepMounted={false}
            aria-label="Reward claim status tabs"
          >
            <Tabs.List>
              <Tabs.Tab
                value="PENDING"
                rightSection={
                  statusCounts.PENDING > 0 ? (
                    <Badge size="xs" color="yellow" variant="filled">
                      {statusCounts.PENDING}
                    </Badge>
                  ) : null
                }
              >
                Pending
              </Tabs.Tab>
              <Tabs.Tab
                value="PROCESSING"
                rightSection={
                  statusCounts.PROCESSING > 0 ? (
                    <Badge size="xs" color="blue" variant="filled">
                      {statusCounts.PROCESSING}
                    </Badge>
                  ) : null
                }
              >
                Processing
              </Tabs.Tab>
              <Tabs.Tab
                value="PAID"
                rightSection={
                  statusCounts.PAID > 0 ? (
                    <Badge size="xs" color="green" variant="filled">
                      {statusCounts.PAID}
                    </Badge>
                  ) : null
                }
              >
                Paid
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Stack>

        <Suspense
          fallback={
            <Center py="xl">
              <Loader />
            </Center>
          }
        >
          {isMobile ? (
            // Mobile Card View
            <Stack gap="md">
              {paginated.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  revealed={revealed[claim.id] || false}
                  onToggleReveal={() => toggleReveal(claim.id)}
                  onAction={() => {
                    if (claim.status === "PENDING") {
                      setProofTargetRow(claim);
                      setProofOpen(true);
                    } else if (claim.status === "PROCESSING") {
                      setConfirmTarget({ id: claim.id, status: "PAID" });
                      setConfirmOpen(true);
                    } else if (claim.status === "PAID") {
                      setViewProofRow(claim);
                      setViewProofOpen(true);
                    }
                  }}
                  loading={loadingAction === claim.id}
                />
              ))}
              {filtered.length > pageSize && (
                <Group justify="center" mt="md">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Text size="sm">
                    Page {page} of {Math.ceil(filtered.length / pageSize)}
                  </Text>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= Math.ceil(filtered.length / pageSize)}
                  >
                    Next
                  </Button>
                </Group>
              )}
            </Stack>
          ) : (
            // Desktop Table View
            <div
              style={{
                contentVisibility: "auto",
                containIntrinsicSize: "400px",
                overflowX: "auto",
              }}
            >
              <AdminTable<AdminClaimApprove>
                records={paginated}
                totalRecords={filtered.length}
                recordsPerPage={pageSize}
                page={page}
                onPageChange={(p) => setPage(p)}
                recordsPerPageOptions={[10, 20, 50]}
                onRecordsPerPageChange={(r) => {
                  setPageSize(r);
                  setPage(1);
                }}
                columns={[
                  {
                    accessor: "id",
                    title: "Claim",
                    width: 80,
                    sortable: true,
                    render: (row) => (
                      <Text fw={600} size="xs">
                        {String(row.id).slice(0, 8)}
                      </Text>
                    ),
                  },
                  {
                    accessor: "user",
                    title: "User",
                    width: 180,
                    sortable: true,
                    render: (row) => (
                      <Text size="xs" fw={500} lineClamp={1}>
                        {row.user?.users_email ??
                          row.user?.email ??
                          row.user_id}
                      </Text>
                    ),
                  },
                  {
                    accessor: "referral_count",
                    title: "Claim Ref",
                    width: 80,
                    sortable: true,
                    render: (row) => (
                      <Text size="xs">{row.referral_count ?? "—"}</Text>
                    ),
                  },
                  {
                    accessor: "total_referrals",
                    title: "Total Ref",
                    width: 80,
                    sortable: true,
                    render: (row) => (
                      <Text size="xs">{row.total_referrals ?? "—"}</Text>
                    ),
                  },
                  {
                    accessor: "amount",
                    title: "Amount",
                    width: 90,
                    sortable: true,
                    render: (row) => (
                      <Text fw={700} size="xs">
                        ₱{row.amount ?? "—"}
                      </Text>
                    ),
                  },
                  {
                    accessor: "method_account",
                    title: "Method / Account",
                    width: 220,
                    render: (row) => (
                      <Stack gap={4}>
                        <Text tt="uppercase" size="xs" fw={700}>
                          {row.payment_method ?? "—"}
                        </Text>
                        <Group gap={4} align="center" wrap="nowrap">
                          <Text
                            size="xs"
                            c="#2D3748"
                            style={{
                              fontFamily: "monospace",
                              wordBreak: "break-all",
                              flex: 1,
                            }}
                          >
                            {revealed[row.id]
                              ? (row.account_details ?? "—")
                              : maskAccount(row.account_details)}
                          </Text>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            onClick={() => toggleReveal(row.id)}
                            style={{ flexShrink: 0 }}
                          >
                            {revealed[row.id] ? (
                              <IconEyeOff size={12} />
                            ) : (
                              <IconEye size={12} />
                            )}
                          </ActionIcon>
                        </Group>
                      </Stack>
                    ),
                  },
                  {
                    accessor: "created_at",
                    title: "Requested",
                    width: 100,
                    sortable: true,
                    render: (row) => (
                      <Text size="xs">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleDateString()
                          : "—"}
                      </Text>
                    ),
                  },
                  {
                    accessor: "status",
                    title: "Status",
                    width: 100,
                    textAlign: "center",
                    sortable: true,
                    render: (row) => {
                      const color = getStatusFormat(row.status);
                      return (
                        <Center>
                          <Badge
                            color={`${color}.9`}
                            variant="filled"
                            size="xs"
                          >
                            {row.status}
                          </Badge>
                        </Center>
                      );
                    },
                  },
                  {
                    accessor: "actions",
                    title: "Actions",
                    width: 120,
                    textAlign: "right",
                    render: (row) => (
                      <Group justify="flex-end" gap="xs">
                        {row.status === "PENDING" && (
                          <Button
                            size="xs"
                            onClick={() => {
                              setProofTargetRow(row);
                              setProofOpen(true);
                            }}
                            loading={loadingAction === row.id}
                            color="blue"
                            leftSection={<IconUpload size={12} />}
                          >
                            Upload
                          </Button>
                        )}
                        {row.status === "PROCESSING" && (
                          <Button
                            size="xs"
                            color="green"
                            onClick={() => {
                              setConfirmTarget({ id: row.id, status: "PAID" });
                              setConfirmOpen(true);
                            }}
                            loading={loadingAction === row.id}
                          >
                            Mark Paid
                          </Button>
                        )}
                        {row.status === "PAID" && (
                          <Button
                            size="xs"
                            onClick={() => {
                              setViewProofRow(row);
                              setViewProofOpen(true);
                            }}
                            leftSection={<IconEye size={12} />}
                          >
                            View
                          </Button>
                        )}
                      </Group>
                    ),
                  },
                ]}
                sortStatus={sortStatus}
                onSortStatusChange={setSortStatus}
                noRecordsText="No reward claims"
              />
            </div>
          )}
        </Suspense>
      </Paper>

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Action"
        centered
      >
        <Stack>
          <Text>
            Are you sure you want to mark this claim{" "}
            <b>{confirmTarget?.status}</b>?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                confirmTarget &&
                doUpdate(confirmTarget.id, confirmTarget.status)
              }
              loading={loadingAction === confirmTarget?.id}
              color={confirmTarget?.status === "PAID" ? "green" : "orange"}
            >
              {confirmTarget?.status}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={proofOpen}
        onClose={() => {
          setProofOpen(false);
          setProofFile(null);
          setProofTargetRow(null);
        }}
        title="Upload Proof of Payment"
        centered
      >
        <Stack>
          <Text size="sm" fw={500}>
            Claim: {proofTargetRow?.id?.slice(0, 8) ?? "—"}
          </Text>

          <FileInput
            label="Proof of Payment File"
            placeholder="Select image or PDF"
            accept="image/*,application/pdf"
            value={proofFile}
            onChange={setProofFile}
            leftSection={<IconArrowRight size={16} />}
          />
          <Text size="xs" c="dimmed">
            Accepted formats: JPEG, PNG, GIF, or PDF (max 5MB)
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setProofOpen(false)}>
              Cancel
            </Button>
            <Button
              color="green"
              onClick={handleUploadAndMarkPaid}
              loading={uploading}
              disabled={!proofFile || uploading}
              leftSection={<IconCheck size={16} />}
            >
              Upload & Mark Paid
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={viewProofOpen}
        onClose={() => {
          setViewProofOpen(false);
          setViewProofRow(null);
        }}
        title="Proof of Payment"
        centered
        size="lg"
      >
        <Stack align="center">{viewProofContent}</Stack>
      </Modal>
    </Stack>
  );
}
