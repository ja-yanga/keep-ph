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
  Textarea,
  Text,
  Center,
  Loader,
  FileInput,
  Tabs, // ADDED Tabs
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Helper function to mask account details
const maskAccount = (v?: string | null) => {
  if (!v) return "—";
  const s = String(v);
  if (s.length <= 6) return s.replace(/.(?=.{2})/g, "*");
  return s.slice(0, 3) + s.slice(3, -3).replace(/./g, "*") + s.slice(-3);
};

// Define the type for tab status
type ClaimStatusTab = "PENDING" | "PAID";

export default function AdminRewards() {
  // map of claimId -> revealed boolean (controls whether admin sees full account)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const toggleReveal = (id: string) =>
    setRevealed((s) => ({ ...s, [id]: !s[id] }));

  const { data, error, isValidating } = useSWR("/api/admin/rewards", fetcher, {
    revalidateOnFocus: true,
  });

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ADDED: State for active tab, defaulting to PENDING
  const [activeTab, setActiveTab] = useState<ClaimStatusTab>("PENDING");

  const [proofOpen, setProofOpen] = useState(false);
  const [proofTargetRow, setProofTargetRow] = useState<any | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  // view proof modal state
  const [viewProofOpen, setViewProofOpen] = useState(false);
  const [viewProofRow, setViewProofRow] = useState<any | null>(null);

  const claims: any[] = Array.isArray(data) ? data : [];

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
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      setGlobalSuccess(`Claim marked ${status}`);
      await swrMutate("/api/admin/rewards");
    } catch (err: any) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: err.message || "Failed to update",
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
      let proof_base64: string | null = null;
      if (proofFile) {
        proof_base64 = await new Promise<string | null>((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = () => resolve(null);
          fr.readAsDataURL(proofFile);
        });
      }

      const res = await fetch(`/api/admin/rewards/${proofTargetRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          proof_base64: proof_base64,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to upload proof");
      }

      notifications.show({
        title: "Marked Paid",
        message: "Claim marked PAID.",
        color: "green",
      });

      // refresh list (GET will include proof_url now)
      await swrMutate("/api/admin/rewards");

      // do not open the uploaded image in a new tab;
      // proof_url will be available in the refreshed list for admins to view.

      setProofOpen(false);
      setProofTargetRow(null);
      setProofFile(null);
    } catch (err: any) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: err.message || "Upload failed",
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

  const filtered = claims.filter((c) => {
    // 1. Tab Filtering Logic
    if (activeTab === "PENDING" && c.status === "PAID") return false; // Show PENDING and PROCESSING
    if (activeTab === "PAID" && c.status !== "PAID") return false; // Only show PAID

    // 2. Search Filtering Logic
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const fields = [
      c.id,
      c.user?.email,
      c.user?.first_name,
      c.user?.last_name,
      String(c.referral_count),
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
    (c) => c.status === "PENDING" || c.status === "PROCESSING"
  ).length;
  const paidCount = claims.filter((c) => c.status === "PAID").length;

  if (isValidating)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );

  return (
    <Stack align="center" w="100%" gap="md">
      {/* GLOBAL SUCCESS ALERT */}
      {globalSuccess && (
        <Alert
          variant="light"
          color="green"
          title="Success"
          icon={<IconCheck size={16} />}
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
          {/* SEARCH AND REFRESH SECTION (Now at the top) */}
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

          {/* TABS SECTION (Now below search) */}
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
              render: (row) => (
                <Text fw={700}>{String(row.id).slice(0, 8)}</Text>
              ),
            },
            {
              accessor: "user",
              title: "User",
              render: (row) => (
                <Stack gap={2}>
                  {" "}
                  {/* Use gap={2} for tight vertical spacing */}
                  <Text size="sm" fw={500}>
                    {row.user?.email || row.user_id}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {(row.user?.first_name || "") +
                      " " +
                      (row.user?.last_name || "")}
                  </Text>
                </Stack>
              ),
            },
            {
              accessor: "referral_count",
              title: "Referrals",
              width: 100,
              render: (row) => <Text>{row.referral_count}</Text>,
            },
            {
              accessor: "amount",
              title: "Amount",
              width: 120,
              render: (row) => <Text fw={700}>PHP {row.amount}</Text>,
            },
            {
              accessor: "method_account",
              title: "Method / Account",
              render: (row) => (
                <Stack gap={2}>
                  <Text size="sm" fw={500}>
                    {row.payment_method}
                  </Text>
                  <Group gap={8} align="center">
                    <Text
                      size="xs"
                      c="dimmed"
                      style={{ wordBreak: "break-all" }}
                    >
                      {revealed[row.id]
                        ? row.account_details
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
              render: (row) => (
                <Text size="sm">
                  {new Date(row.created_at).toLocaleString()}
                </Text>
              ),
            },
            // SEPARATE STATUS COLUMN
            {
              accessor: "status_display",
              title: "Status",
              width: 100,
              textAlign: "center",
              render: (row) => (
                <Center>
                  <Badge
                    color={
                      row.status === "PAID"
                        ? "green"
                        : row.status === "PROCESSING"
                        ? "orange"
                        : "gray"
                    }
                    size="md"
                  >
                    {row.status}
                  </Badge>
                </Center>
              ),
            },
            // ACTIONS COLUMN (Rightmost)
            {
              accessor: "actions",
              title: "Actions",
              width: 180,
              textAlign: "right",
              render: (row) => (
                // Only buttons are here now
                <Group justify="flex-end" gap="xs">
                  {/* PENDING now opens the Proof Upload modal */}
                  {row.status === "PENDING" && (
                    <Button
                      size="xs"
                      onClick={() => {
                        setProofTargetRow(row);
                        setProofOpen(true);
                      }}
                      loading={loadingAction === row.id}
                      // Changed from variant="subtle" to solid (default)
                      color="blue"
                      leftSection={<IconUpload size={16} />} // ADDED ICON
                    >
                      Upload Proof
                    </Button>
                  )}

                  {/* PROCESSING status still allows marking PAID via simple confirmation */}
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

                  {/* Placeholder for Paid status actions */}
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

      {/* Confirmation Modal (Used for simple status changes, currently only PROCESSING -> PAID) */}
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
          {/* Use justify="flex-end" for buttons */}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => doUpdate(confirmTarget.id, confirmTarget.status)}
              loading={loadingAction === confirmTarget?.id}
              color={confirmTarget?.status === "PAID" ? "green" : "orange"}
            >
              {confirmTarget?.status}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Proof Upload Modal (New) */}
      <Modal
        opened={proofOpen}
        onClose={() => {
          setProofOpen(false);
          setProofFile(null); // Clear file on close
        }}
        title="Upload Proof of Payment"
        centered
      >
        <Stack>
          <Text size="sm" fw={500}>
            Claim: {proofTargetRow?.id?.slice(0, 8)}
          </Text>

          {/* Transaction ID removed — upload file only */}

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
            {/* Confirmed styling: solid button with IconCheck in leftSection */}
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

      {/* View Proof Modal */}
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
        <Stack align="center">
          {viewProofRow?.proof_url ? (
            // keep inside modal — scaled to fit
            // PDFs will render in browser if supported; images will display as img
            viewProofRow.proof_url.endsWith(".pdf") ? (
              <iframe
                src={viewProofRow.proof_url}
                title="Proof PDF"
                style={{ width: "100%", height: "60vh", border: "none" }}
              />
            ) : (
              <img
                src={viewProofRow.proof_url}
                alt="proof"
                style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 8 }}
              />
            )
          ) : (
            <Text c="dimmed">No proof available for this claim.</Text>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
