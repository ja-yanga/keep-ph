"use client";

import "mantine-datatable/styles.layer.css";

import React, { useEffect, useState, Suspense, useMemo } from "react";
import dynamic from "next/dynamic";
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
  Tooltip,
  Text,
  Center,
  Loader,
  FileInput,
  Tabs,
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
import type {
  AdminClaimApprove,
  ClaimStatusTab,
  ConfirmTarget,
} from "@/utils/types";
import { getStatusFormat, maskAccount } from "@/utils/helper";
import { type DataTableProps } from "mantine-datatable";

// Dynamically import DataTable to reduce initial bundle size
const DataTable = dynamic(
  () => import("mantine-datatable").then((mod) => mod.DataTable),
  {
    ssr: false,
    loading: () => (
      <Center py="xl">
        <Loader />
      </Center>
    ),
  },
) as <T>(props: DataTableProps<T>) => React.ReactElement;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminRewards() {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const toggleReveal = (id: string) =>
    setRevealed((s) => ({ ...s, [id]: !s[id] }));

  const isMobile = useMediaQuery("(max-width: 768px)");

  const { data, error, isValidating } = useSWR("/api/admin/rewards", fetcher, {
    revalidateOnFocus: false, // Reduce unnecessary revalidations
    revalidateOnReconnect: true,
    dedupingInterval: 2000, // Dedupe requests within 2 seconds
  });

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [activeTab, setActiveTab] = useState<ClaimStatusTab>("PENDING");

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
      // Validate file exists
      if (!proofFile) {
        throw new Error("Please select a file to upload");
      }

      // Check file size (limit to 5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (proofFile.size > MAX_FILE_SIZE) {
        throw new Error(
          `File size exceeds 5MB limit (${(proofFile.size / (1024 * 1024)).toFixed(2)}MB)`,
        );
      }

      // Check file type
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

      // Convert file to base64
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

      if (process.env.NODE_ENV === "development") {
        console.debug("admin:upload:prepare", {
          claimId: proofTargetRow?.id,
          fileName: proofFile.name,
          fileType: proofFile.type,
          fileSize: proofFile.size,
          base64Length: proof_base64.length,
        });
      }

      // Make the API request
      const res = await fetch(`/api/admin/rewards/${proofTargetRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          proof_base64,
        }),
      });

      // Clone the response before reading its body to avoid consuming it
      const responseClone = res.clone();

      // Try to parse as JSON first
      let json: Record<string, unknown> | null = null;
      let responseText = "";

      try {
        json = await res.json();
      } catch (jsonError) {
        // If JSON parsing fails, get the text content
        responseText = await responseClone.text().catch(() => "");
        if (process.env.NODE_ENV === "development") {
          console.error("admin:upload:json_parse_error", {
            error: String(jsonError),
            responseText,
            status: res.status,
            statusText: res.statusText,
          });
        }
      }

      if (!res.ok) {
        if (process.env.NODE_ENV === "development") {
          console.error("admin:upload:response_error", {
            status: res.status,
            statusText: res.statusText,
            json,
            responseText,
          });
        }

        // Extract error message with better fallbacks
        const errorMessage = json?.error
          ? String(json.error)
          : responseText ||
            `Failed to upload proof (${res.status}: ${res.statusText})`;

        throw new Error(errorMessage);
      }

      if (process.env.NODE_ENV === "development") {
        console.debug("admin:upload:success", {
          claimId: proofTargetRow.id,
          body: json,
        });
      }

      notifications.show({
        title: "Marked Paid",
        message: "Claim marked PAID.",
        color: "green",
      });

      await swrMutate("/api/admin/rewards");

      setProofOpen(false);
      setProofTargetRow(null);
      setProofFile(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV === "development") {
        console.error("admin:upload:error", message);
      }
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

  // Memoize filtered and paginated data to prevent unnecessary recalculations
  const filtered = useMemo(() => {
    return claims.filter((c) => {
      if (activeTab === "PENDING" && c.status === "PAID") return false;
      if (activeTab === "PAID" && c.status !== "PAID") return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      const fields = [
        c.id,
        c.user?.email,
        c.user?.users_email,
        // c.user?.first_name,
        // c.user?.last_name,
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
  }, [claims, activeTab, search]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const pendingCount = useMemo(
    () =>
      claims.filter((c) => c.status === "PENDING" || c.status === "PROCESSING")
        .length,
    [claims],
  );
  const paidCount = useMemo(
    () => claims.filter((c) => c.status === "PAID").length,
    [claims],
  );

  if (isValidating)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );

  // avoid nested ternary expressions for proof preview
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
      // use next/image to improve LCP and bandwidth (unoptimized for signed/remote URLs)
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
          <Group
            justify="space-between"
            gap="xs"
            align="center"
            wrap="nowrap"
            w="100%"
          >
            <Group style={{ flex: 1 }} gap="xs" wrap="nowrap">
              <TextInput
                placeholder="Search claims..."
                leftSection={<IconSearch size={16} aria-hidden="true" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.currentTarget.value);
                  setPage(1); // Reset page on search
                }}
                style={{ flex: 1 }}
                aria-label="Search reward claims"
              />
            </Group>
          </Group>

          <Tabs
            value={activeTab}
            onChange={(value) => {
              setActiveTab((value as ClaimStatusTab) || "PENDING");
              setPage(1); // Reset page on tab change
            }}
            keepMounted={false}
            aria-label="Reward claim status tabs"
          >
            <Tabs.List>
              <Tabs.Tab
                value="PENDING"
                rightSection={
                  activeTab === "PENDING" && pendingCount > 0 ? (
                    <Badge size="xs" color="blue" variant="filled">
                      {pendingCount}
                    </Badge>
                  ) : null
                }
              >
                Pending Action
              </Tabs.Tab>
              <Tabs.Tab
                value="PAID"
                rightSection={
                  activeTab === "PAID" && paidCount > 0 ? (
                    <Badge size="xs" color="green" variant="filled">
                      {paidCount}
                    </Badge>
                  ) : null
                }
              >
                Paid/Completed
              </Tabs.Tab>
            </Tabs.List>

            {/* Panels are required so Tabs can generate valid aria-controls/tabpanel ids */}
            <Tabs.Panel value="PENDING">{null}</Tabs.Panel>
            <Tabs.Panel value="PAID">{null}</Tabs.Panel>
          </Tabs>
        </Stack>

        <Suspense
          fallback={
            <Center py="xl">
              <Loader />
            </Center>
          }
        >
          <div
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "400px",
            }}
          >
            <DataTable<AdminClaimApprove>
              withTableBorder={false}
              borderRadius="lg"
              striped
              highlightOnHover
              verticalSpacing="md"
              minHeight={minTableHeight(pageSize)}
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
                  width: 100,
                  render: (record: unknown) => {
                    const row = record as AdminClaimApprove;
                    return <Text fw={700}>{String(row.id).slice(0, 8)}</Text>;
                  },
                },
                {
                  accessor: "user",
                  title: "User",
                  width: 250,
                  render: (record: unknown) => {
                    const row = record as AdminClaimApprove;
                    return (
                      <Stack gap={2}>
                        <Text size="sm" fw={500}>
                          {row.user?.users_email ??
                            row.user?.email ??
                            row.user_id}
                        </Text>
                        {/* <Text size="xs" c="dimmed">
                    {(row.user?.first_name ?? "") +
                      " " +
                      (row.user?.last_name ?? "")}
                  </Text> */}
                      </Stack>
                    );
                  },
                },
                {
                  accessor: "referral_count",
                  title: "Claim Ref",
                  width: 100,
                  render: (record: unknown) => {
                    const row = record as AdminClaimApprove;
                    return <Text>{row.referral_count ?? "—"}</Text>;
                  },
                },
                {
                  accessor: "total_referrals",
                  title: "Total Ref",
                  width: 90,
                  render: (record: unknown) => {
                    const row = record as AdminClaimApprove;
                    return <Text>{row.total_referrals ?? "—"}</Text>;
                  },
                },
                {
                  accessor: "amount",
                  title: "Amount",
                  width: 110,
                  render: (record: unknown) => {
                    const row = record as AdminClaimApprove;
                    return <Text fw={700}>PHP {row.amount ?? "—"}</Text>;
                  },
                },
                {
                  accessor: "method_account",
                  title: "Method / Account",
                  width: 250,
                  render: (record: unknown) => {
                    const row = record as AdminClaimApprove;
                    return (
                      <Stack gap={2}>
                        <Text
                          style={{ textTransform: "uppercase" }}
                          size="sm"
                          fw={700}
                        >
                          {row.payment_method ?? "—"}
                        </Text>
                        <Group gap={8} align="center" justify="space-between">
                          <Text
                            size="xs"
                            c="#2D3748"
                            style={{ wordBreak: "break-all" }}
                          >
                            {revealed[row.id]
                              ? (row.account_details ?? "—")
                              : maskAccount(row.account_details)}
                          </Text>
                          <Tooltip label={revealed[row.id] ? "Hide" : "Reveal"}>
                            <ActionIcon
                              size="sm"
                              onClick={() => toggleReveal(row.id)}
                              aria-label={
                                revealed[row.id]
                                  ? "Hide account details"
                                  : "Reveal account details"
                              }
                              aria-pressed={revealed[row.id]}
                            >
                              {revealed[row.id] ? (
                                <IconEyeOff size={14} aria-hidden="true" />
                              ) : (
                                <IconEye size={14} aria-hidden="true" />
                              )}
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Stack>
                    );
                  },
                },
                {
                  accessor: "created_at",
                  title: "Requested",
                  width: 180,
                  render: (record: unknown) => {
                    const row = record as AdminClaimApprove;
                    return (
                      <Text size="sm">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleString()
                          : "—"}
                      </Text>
                    );
                  },
                },
                {
                  accessor: "status_display",
                  title: "Status",
                  width: 150,
                  textAlign: "center",
                  render: (record: unknown) => {
                    const row = record as AdminClaimApprove;
                    const color = getStatusFormat(row.status);
                    // Use a darker shade for better contrast
                    const badgeColor = `${color}.9`;
                    return (
                      <Center>
                        <Badge
                          color={badgeColor}
                          variant="filled"
                          size="md"
                          w={100}
                        >
                          {row.status ?? "—"}
                        </Badge>
                      </Center>
                    );
                  },
                },
                {
                  accessor: "actions",
                  title: "Actions",
                  width: 160,
                  textAlign: "right" as const,
                  render: (record: unknown) => {
                    const row = record as AdminClaimApprove;
                    return (
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
                            leftSection={
                              <IconUpload size={16} aria-hidden="true" />
                            }
                            w={140}
                            aria-label={`Upload proof for claim ${row.id}`}
                          >
                            Upload Proof
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
                            w={140}
                            aria-label={`Mark claim ${row.id} as paid`}
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
                            leftSection={
                              <IconEye size={14} aria-hidden="true" />
                            }
                            w={140}
                            aria-label={`View proof for claim ${row.id}`}
                          >
                            View Proof
                          </Button>
                        )}
                      </Group>
                    );
                  },
                },
              ]}
              noRecordsText="No reward claims"
            />
          </div>
        </Suspense>
      </Paper>

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Action"
        centered
      >
        <Stack>
          <Text id="confirm-modal-description">
            Are you sure you want to mark this claim{" "}
            <b>{confirmTarget?.status}</b>?
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setConfirmOpen(false)}
              aria-label="Cancel confirmation"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                confirmTarget &&
                doUpdate(confirmTarget.id, confirmTarget.status)
              }
              loading={loadingAction === confirmTarget?.id}
              color={confirmTarget?.status === "PAID" ? "green" : "orange"}
              aria-label={`Confirm marking claim as ${confirmTarget?.status}`}
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
            leftSection={<IconArrowRight size={16} aria-hidden="true" />}
            aria-label="Select proof of payment file"
            aria-describedby="file-input-description"
          />
          <Text size="xs" c="#2D3748" id="file-input-description">
            Accepted formats: JPEG, PNG, GIF, or PDF (max 5MB)
          </Text>

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setProofOpen(false)}
              aria-label="Cancel upload"
            >
              Cancel
            </Button>
            <Button
              color="green"
              onClick={handleUploadAndMarkPaid}
              loading={uploading}
              disabled={!proofFile || uploading}
              leftSection={<IconCheck size={16} aria-hidden="true" />}
              aria-label="Upload proof and mark claim as paid"
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

function minTableHeight(pageSize: number) {
  return 52 * pageSize + 50;
}
