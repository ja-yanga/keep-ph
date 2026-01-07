"use client";

import "mantine-datatable/styles.layer.css";

import React, { useEffect, useState } from "react";
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
import {
  IconSearch,
  IconCheck,
  IconArrowRight,
  IconUpload,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";
import Image from "next/image";
import type {
  AdminClaimApprove,
  ClaimStatusTab,
  ConfirmTarget,
} from "@/utils/types";
import { getStatusFormat, maskAccount } from "@/utils/helper";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminRewards() {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const toggleReveal = (id: string) =>
    setRevealed((s) => ({ ...s, [id]: !s[id] }));

  const { data, error, isValidating } = useSWR("/api/admin/rewards", fetcher, {
    revalidateOnFocus: true,
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
      console.error(message);
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

      console.debug("admin:upload:prepare", {
        claimId: proofTargetRow?.id,
        fileName: proofFile.name,
        fileType: proofFile.type,
        fileSize: proofFile.size,
        base64Length: proof_base64.length,
      });

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
        console.error("admin:upload:json_parse_error", {
          error: String(jsonError),
          responseText,
          status: res.status,
          statusText: res.statusText,
        });
      }

      if (!res.ok) {
        console.error("admin:upload:response_error", {
          status: res.status,
          statusText: res.statusText,
          json,
          responseText,
        });

        // Extract error message with better fallbacks
        const errorMessage = json?.error
          ? String(json.error)
          : responseText ||
            `Failed to upload proof (${res.status}: ${res.statusText})`;

        throw new Error(errorMessage);
      }

      console.debug("admin:upload:success", {
        claimId: proofTargetRow.id,
        body: json,
      });

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
      console.error("admin:upload:error", message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

  const filtered = claims.filter((c) => {
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

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const pendingCount = claims.filter(
    (c) => c.status === "PENDING" || c.status === "PROCESSING",
  ).length;
  const paidCount = claims.filter((c) => c.status === "PAID").length;

  if (isValidating)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );

  // avoid nested ternary expressions for proof preview
  let viewProofContent: React.ReactNode = (
    <Text c="dimmed">No proof available for this claim.</Text>
  );
  if (viewProofRow?.proof_url) {
    if (viewProofRow.proof_url.endsWith(".pdf")) {
      viewProofContent = (
        <iframe
          src={viewProofRow.proof_url}
          title="Proof PDF"
          style={{ width: "100%", height: "60vh", border: "none" }}
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
        >
          <Image
            src={viewProofRow.proof_url}
            alt="proof"
            fill
            style={{ objectFit: "contain", borderRadius: 8 }}
            unoptimized
          />
        </div>
      );
    }
  }

  return (
    <Stack align="center" w="100%" gap="md">
      {globalSuccess && (
        <Alert
          variant="light"
          color="green"
          title="Success"
          withCloseButton
          onClose={() => setGlobalSuccess(null)}
          w="100%"
          maw={1200}
        >
          {globalSuccess}
        </Alert>
      )}

      <Paper p="md" radius="md" withBorder shadow="sm" w="100%" maw={1200}>
        <Stack gap="md" mb="md">
          <Group gap="sm" wrap="nowrap" w="100%">
            <TextInput
              placeholder="Search claims..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1); // Reset page on search
              }}
              style={{ flexGrow: 1, maxWidth: 400 }}
            />
          </Group>

          <Tabs
            value={activeTab}
            onChange={(value) => {
              setActiveTab(value as ClaimStatusTab);
              setPage(1); // Reset page on tab change
            }}
            keepMounted={false}
          >
            <Tabs.List>
              <Tabs.Tab
                value="PENDING"
                rightSection={
                  <Badge
                    w={16}
                    h={16}
                    bg="transparent"
                    c="blue"
                    p={0}
                    variant="filled"
                    radius="sm"
                  >
                    {pendingCount}
                  </Badge>
                }
              >
                Pending Action
              </Tabs.Tab>
              <Tabs.Tab
                value="PAID"
                rightSection={
                  <Badge
                    w={16}
                    h={16}
                    bg="transparent"
                    c="green"
                    p={0}
                    variant="filled"
                    radius="sm"
                  >
                    {paidCount}
                  </Badge>
                }
              >
                Paid/Completed
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Stack>

        <DataTable
          withTableBorder
          borderRadius="sm"
          withColumnBorders
          striped
          highlightOnHover
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
          minHeight={200}
          columns={[
            {
              accessor: "id",
              title: "Claim",
              width: 120,
              render: (row: AdminClaimApprove) => (
                <Text fw={700}>{String(row.id).slice(0, 8)}</Text>
              ),
            },
            {
              accessor: "user",
              title: "User",
              render: (row: AdminClaimApprove) => (
                <Stack gap={2}>
                  <Text size="sm" fw={500}>
                    {row.user?.users_email ?? row.user?.email ?? row.user_id}
                  </Text>
                  {/* <Text size="xs" c="dimmed">
                    {(row.user?.first_name ?? "") +
                      " " +
                      (row.user?.last_name ?? "")}
                  </Text> */}
                </Stack>
              ),
            },
            {
              accessor: "referral_count",
              title: "Referrals",
              width: 100,
              render: (row: AdminClaimApprove) => (
                <Text>{row.referral_count ?? "—"}</Text>
              ),
            },
            {
              accessor: "amount",
              title: "Amount",
              width: 120,
              render: (row: AdminClaimApprove) => (
                <Text fw={700}>PHP {row.amount ?? "—"}</Text>
              ),
            },
            {
              accessor: "method_account",
              title: "Method / Account",
              render: (row: AdminClaimApprove) => (
                <Stack gap={2}>
                  <Text size="sm" fw={500}>
                    {row.payment_method ?? "—"}
                  </Text>
                  <Group gap={8} align="center">
                    <Text
                      size="xs"
                      c="dimmed"
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
                        aria-label="reveal account"
                      >
                        {revealed[row.id] ? (
                          <IconEyeOff size={14} />
                        ) : (
                          <IconEye size={14} />
                        )}
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Stack>
              ),
            },
            {
              accessor: "created_at",
              title: "Requested",
              width: 180,
              render: (row: AdminClaimApprove) => (
                <Text size="sm">
                  {row.created_at
                    ? new Date(row.created_at).toLocaleString()
                    : "—"}
                </Text>
              ),
            },
            {
              accessor: "status_display",
              title: "Status",
              width: 100,
              textAlign: "center",
              render: (row: AdminClaimApprove) => (
                <Center>
                  <Badge color={getStatusFormat(row.status)} size="md">
                    {row.status ?? "—"}
                  </Badge>
                </Center>
              ),
            },
            {
              accessor: "actions",
              title: "Actions",
              width: 180,
              textAlign: "right",
              render: (row: AdminClaimApprove) => (
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
                      leftSection={<IconUpload size={16} />}
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
                      leftSection={<IconEye size={14} />}
                    >
                      View Proof
                    </Button>
                  )}
                </Group>
              ),
            },
          ]}
          noRecordsText="No reward claims"
        />
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
