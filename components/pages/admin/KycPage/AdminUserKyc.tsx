"use client";

import "mantine-datatable/styles.layer.css";
import React, { useEffect, useState } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import {
  Paper,
  Group,
  TextInput,
  Button,
  Stack,
  Badge,
  Modal,
  Text,
  Loader,
  Center,
  Avatar,
  Grid,
  Image,
} from "@mantine/core";
import { DataTable } from "mantine-datatable";
import {
  IconSearch,
  IconUserCheck,
  IconX,
  IconInfoCircle,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { useDisclosure } from "@mantine/hooks";
import { getStatusFormat, normalizeImageUrl } from "@/utils/helper";

type KycRow = {
  id: string;
  user_id: string;
  status: "SUBMITTED" | "VERIFIED" | "UNVERIFIED" | "REJECTED" | string;
  id_document_type?: string | null;
  id_front_url?: string | null;
  id_back_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  // Assuming a structured address object for readability
  address?: {
    line1?: string;
    line2?: string | null;
    city?: string;
    region?: string;
    postal?: string;
  } | null;
  submitted_at?: string | null;
  verified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to fetch ${url}`);
  }
  return res.json();
};

// Helper component for consistent label-top, value-bottom styling
const DetailStack = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <Stack gap={2} mt="md">
    <Text fw={700} size="sm">
      {label}
    </Text>
    {children}
  </Stack>
);

// Helper function to format the address object into readable lines
function formatAddress(address?: KycRow["address"]): React.ReactNode {
  if (!address) return <Text c="dimmed">—</Text>;

  const parts = [];
  if (address.line1) parts.push(address.line1);
  if (address.line2) parts.push(address.line2);

  const cityRegionPostal = [address.city, address.region, address.postal]
    .filter(Boolean)
    .join(", ");

  if (cityRegionPostal) parts.push(cityRegionPostal);

  if (parts.length === 0) return <Text c="dimmed">—</Text>;

  return (
    <Stack gap={0}>
      {parts.map((part, index) => (
        <Text key={index} size="sm">
          {part}
        </Text>
      ))}
    </Stack>
  );
}

export default function AdminUserKyc() {
  const key = "/api/admin/user-kyc";
  const { data, error, isValidating } = useSWR(key, fetcher, {
    revalidateOnFocus: true,
  });

  // pagination state required by DataTable props
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [rows, setRows] = useState<KycRow[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<KycRow | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resolvedFront] = useState<string | null>(null);
  const [resolvedBack] = useState<string | null>(null);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [zoomOpen, { open: openZoom, close: closeZoom }] = useDisclosure(false);

  useEffect(() => {
    let arr: KycRow[];
    if (Array.isArray(data?.data)) {
      arr = data.data;
    } else if (Array.isArray(data)) {
      arr = data;
    } else {
      arr = [];
    }
    setRows(arr);
  }, [data]);

  // const refresh = async () => {
  //   try {
  //     await swrMutate(key);
  //     notifications.show({
  //       title: "Refreshed",
  //       message: "KYC list updated",
  //       color: "green",
  //     });
  //   } catch (err) {
  //     console.error("Refresh error:", err);
  //     notifications.show({
  //       title: "Error",
  //       message: "Failed to refresh",
  //       color: "red",
  //     });
  //   }
  // };

  const openDetails = (r: KycRow) => {
    setSelected(r);
    setModalOpen(true);
  };

  const actionVerify = async (r: KycRow, status: "VERIFIED" | "REJECTED") => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/user-kyc/${r.user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: status }),
      });
      if (!res.ok) throw new Error("Action failed");
      notifications.show({
        title: "Success",
        message: `Set ${status}`,
        color: "green",
      });
      await swrMutate(key);
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      notifications.show({
        title: "Error",
        message: "Failed to update",
        color: "red",
      });
    } finally {
      setProcessing(false);
    }
  };

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = (
      r.full_name || `${r.first_name ?? ""} ${r.last_name ?? ""}`
    ).toLowerCase();
    return name.includes(q) || (r.user_id ?? "").toLowerCase().includes(q);
  });

  // client-side pagination (copying MailroomRegistrations approach)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (error) {
    return (
      <Center style={{ padding: 40 }}>
        <Text color="red">Failed to load KYC records</Text>
      </Center>
    );
  }

  return (
    <Stack align="center">
      <Paper p="md" radius="md" withBorder shadow="sm" w="100%" maw={1200}>
        <Group justify="space-between" mb="md">
          <Group>
            <TextInput
              placeholder="Search by name or user id..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
              style={{ width: 300 }}
            />
          </Group>

          <Badge size="lg" variant="light">
            {rows.length} KYC records
          </Badge>
        </Group>

        <DataTable
          withTableBorder
          borderRadius="sm"
          withColumnBorders
          striped
          highlightOnHover
          records={paginated}
          idAccessor="id"
          fetching={isValidating}
          minHeight={250}
          page={page}
          onPageChange={(p: number) => setPage(p)}
          totalRecords={filtered.length}
          recordsPerPage={pageSize}
          recordsPerPageOptions={[10, 20, 50]}
          onRecordsPerPageChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          columns={[
            {
              accessor: "user",
              title: "User",
              render: (r: KycRow) => {
                const name =
                  r.full_name ?? `${r.first_name ?? ""} ${r.last_name ?? ""}`;
                return (
                  <Group>
                    <Avatar radius="xl">{String(name || "U").charAt(0)}</Avatar>
                    <div>
                      <Text fw={500} size="sm">
                        {name || "Unknown"}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {String(r.user_id ?? "")}
                      </Text>
                    </div>
                  </Group>
                );
              },
            },
            {
              accessor: "doc",
              title: "Document",
              render: (r: KycRow) => (
                <div>
                  <Text size="sm">{r.id_document_type ?? "—"}</Text>
                </div>
              ),
            },
            {
              accessor: "status",
              title: "Status",
              width: 130,
              render: (r: KycRow) => {
                return (
                  <Badge color={getStatusFormat(r.status)} variant="light">
                    {r.status}
                  </Badge>
                );
              },
            },
            {
              accessor: "dates",
              title: "Submitted / Verified",
              width: 220,
              render: (r: KycRow) => {
                let submitted: string;
                if (r.submitted_at) {
                  submitted = dayjs(r.submitted_at).format("MMM D, YYYY");
                } else {
                  submitted = "—";
                }
                let verified: string;
                if (r.verified_at) {
                  verified = dayjs(r.verified_at).format("MMM D, YYYY");
                } else {
                  verified = "—";
                }
                return (
                  <div>
                    <Text size="xs" c="dimmed">
                      Submitted: {submitted}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Verified: {verified}
                    </Text>
                  </div>
                );
              },
            },
            {
              accessor: "actions",
              title: "Actions",
              textAlign: "right",
              width: 200,
              render: (r: KycRow) => (
                <Group justify="right">
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconInfoCircle size={14} />}
                    onClick={() => openDetails(r)}
                  >
                    Manage
                  </Button>
                </Group>
              ),
            },
          ]}
          noRecordsText="No KYC records found"
        />
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="KYC Details"
        size="lg"
        centered
      >
        {selected ? (
          <Stack>
            <Grid>
              <Grid.Col span={6}>
                <DetailStack label="Name">
                  <Text size="sm" fw={500}>
                    {selected.full_name ??
                      `${selected.first_name ?? ""} ${
                        selected.last_name ?? ""
                      }`}
                  </Text>
                </DetailStack>

                <DetailStack label="Document">
                  <Text size="sm" fw={500}>
                    {selected.id_document_type ?? "—"}
                  </Text>
                </DetailStack>
              </Grid.Col>

              <Grid.Col span={6}>
                <DetailStack label="Address">
                  {formatAddress(selected.address)}
                </DetailStack>

                <DetailStack label="Timestamps">
                  <Text size="sm">
                    Submitted:{" "}
                    <Text span fw={500}>
                      {selected.submitted_at
                        ? dayjs(selected.submitted_at).format(
                            "MMM D, YYYY hh:mm A",
                          )
                        : "—"}
                    </Text>
                  </Text>
                  <Text size="sm">
                    Verified:{" "}
                    <Text span fw={500}>
                      {selected.verified_at
                        ? dayjs(selected.verified_at).format(
                            "MMM D, YYYY hh:mm A",
                          )
                        : "—"}
                    </Text>
                  </Text>
                </DetailStack>
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={6}>
                <DetailStack label="ID Front">
                  {selected.id_front_url && (
                    <div>
                      <Text size="xs" c="dimmed">
                        Front
                      </Text>
                      {(() => {
                        const src =
                          resolvedFront ??
                          normalizeImageUrl(selected.id_front_url);
                        return src ? (
                          <Image
                            src={src}
                            alt="ID front"
                            width={240}
                            height={160}
                            fit="cover"
                            radius="sm"
                            style={{ cursor: "zoom-in" }}
                            onClick={() => {
                              setModalImageSrc(src);
                              openZoom();
                            }}
                          />
                        ) : (
                          <Text size="xs" c="dimmed">
                            Image unavailable
                          </Text>
                        );
                      })()}
                    </div>
                  )}
                </DetailStack>
              </Grid.Col>

              <Grid.Col span={6}>
                <DetailStack label="ID Back">
                  {selected.id_back_url && (
                    <div>
                      <Text size="xs" c="dimmed">
                        Back
                      </Text>
                      {(() => {
                        const src =
                          resolvedBack ??
                          normalizeImageUrl(selected.id_back_url);
                        return src ? (
                          <Image
                            src={src}
                            alt="ID back"
                            width={240}
                            height={160}
                            fit="cover"
                            radius="sm"
                            style={{ cursor: "zoom-in" }}
                            onClick={() => {
                              setModalImageSrc(src);
                              openZoom();
                            }}
                          />
                        ) : (
                          <Text size="xs" c="dimmed">
                            Image unavailable
                          </Text>
                        );
                      })()}
                    </div>
                  )}
                </DetailStack>
              </Grid.Col>
            </Grid>

            <Group justify="flex-end" mt="xl">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Close
              </Button>

              {selected.status === "SUBMITTED" && (
                <Button
                  color="red"
                  variant="outline"
                  onClick={() => actionVerify(selected, "REJECTED")}
                  loading={processing}
                  leftSection={<IconX size={16} />}
                >
                  Reject
                </Button>
              )}

              {selected.status !== "VERIFIED" && (
                <Button
                  color="green"
                  onClick={() => actionVerify(selected, "VERIFIED")}
                  loading={processing}
                  leftSection={<IconUserCheck size={16} />}
                >
                  Mark Verified
                </Button>
              )}
            </Group>

            {/* Zoom modal for clicked ID image */}
            <Modal opened={zoomOpen} onClose={closeZoom} size="lg" centered>
              {modalImageSrc && (
                <Image
                  src={modalImageSrc}
                  alt="ID preview"
                  fit="contain"
                  mah="80vh"
                  w="100%"
                />
              )}
            </Modal>
          </Stack>
        ) : (
          <Center>
            <Loader />
          </Center>
        )}
      </Modal>
    </Stack>
  );
}
