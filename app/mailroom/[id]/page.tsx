"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Accordion,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconRefresh,
  IconChevronDown,
} from "@tabler/icons-react";
import Link from "next/link";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";

function addMonths(iso?: string | null, months = 0) {
  if (!iso) return null;
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export default function MailroomPackagePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id ?? "";
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let res = await fetch(`/api/mailroom/registrations/${id}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const listRes = await fetch("/api/mailroom/registrations", {
            credentials: "include",
          });
          if (!listRes.ok) throw new Error("Failed to load registrations");
          const json = await listRes.json();
          const rows = Array.isArray(json?.data ?? json)
            ? json.data ?? json
            : [];
          const found = rows.find((r: any) => String(r.id) === String(id));
          if (!mounted) return;
          if (!found) {
            setError("Mailroom registration not found");
            setItem(null);
            return;
          }
          setItem(found);
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (!mounted) return;
        setItem(json?.data ?? json ?? null);
      } catch (err: any) {
        console.error(err);
        if (mounted) setError(err.message ?? "Failed to load");
        setItem(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Box
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DashboardNav />
        <Container py="xl">
          <Loader />
        </Container>
        <Footer />
      </Box>
    );
  }

  if (error || !item) {
    return (
      <Box
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DashboardNav />
        <Container py="xl">
          <Text c="red">{error ?? "Not found"}</Text>
          <Group mt="md">
            <Link href="/dashboard">
              <Button leftSection={<IconArrowLeft size={16} />}>
                Back to list
              </Button>
            </Link>
          </Group>
        </Container>
        <Footer />
      </Box>
    );
  }

  const accountNumber = `U${String(item.user_id ?? "u").slice(0, 8)}-L${String(
    item.location_id ?? item.mailroom_locations?.id ?? "l"
  ).slice(0, 8)}-M${String(item.id ?? "").slice(0, 8)}`;
  const expiry =
    item.months && item.created_at
      ? addMonths(item.created_at, Number(item.months))
      : item.expiry_at ?? null;

  return (
    <Box
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <DashboardNav />
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Group justify="space-between" align="center" mb="md">
            <Group>
              <Link href="/dashboard">
                <Button leftSection={<IconArrowLeft size={16} />}>Back</Button>
              </Link>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={() => router.refresh()}
              >
                Refresh
              </Button>
            </Group>
            <Title order={3}>
              {item.mailroom_plans?.name ??
                item.package_name ??
                item.title ??
                "Mailroom Package"}
            </Title>
          </Group>

          <Stack gap="md">
            <Group justify="space-between">
              <Text c="dimmed">Locker Status</Text>
              <Badge color={item.locker_status ? "gray" : "yellow"}>
                {item.locker_status ?? "—"}
              </Badge>
            </Group>

            <Group justify="space-between">
              <Text c="dimmed">Subscription Expiry</Text>
              <Text fw={700}>
                {expiry ? new Date(expiry).toLocaleDateString() : "—"}
              </Text>
            </Group>

            <Divider />

            {/* Collapsible sections using Accordion */}
            <Accordion variant="separated" defaultValue={null}>
              <Accordion.Item value="mailroom">
                <Accordion.Control icon={<IconChevronDown size={16} />}>
                  Mailroom Details
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text c="dimmed">Date Created</Text>
                      <Text>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "—"}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text c="dimmed">Locker Quantity</Text>
                      <Text>
                        {item.locker_qty ?? item.lockers?.length ?? "—"}
                      </Text>
                    </Group>

                    <Paper withBorder p="sm">
                      <Text fw={700} mb="xs">
                        Lockers
                      </Text>
                      <ScrollArea style={{ maxHeight: 260 }}>
                        <Table verticalSpacing="xs" style={{ fontSize: 13 }}>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Label</Table.Th>
                              <Table.Th>Status</Table.Th>
                              <Table.Th>Removal</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {Array.isArray(item.lockers) &&
                            item.lockers.length > 0 ? (
                              item.lockers.map((L: any) => (
                                <Table.Tr key={L.id}>
                                  <Table.Td>{L.label}</Table.Td>
                                  <Table.Td>{L.status}</Table.Td>
                                </Table.Tr>
                              ))
                            ) : (
                              <Table.Tr>
                                <Table.Td colSpan={3}>
                                  <Text c="dimmed">No lockers</Text>
                                </Table.Td>
                              </Table.Tr>
                            )}
                          </Table.Tbody>
                        </Table>
                      </ScrollArea>
                    </Paper>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="user">
                <Accordion.Control icon={<IconChevronDown size={16} />}>
                  User Details
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <Stack gap={4}>
                      <Text c="dimmed">Account Number</Text>
                      <Text fw={700}>{accountNumber}</Text>
                    </Stack>

                    <Group justify="space-between">
                      <div>
                        <Text c="dimmed">Full Name</Text>
                        <Text fw={700}>
                          {item.full_name ??
                            item.user_name ??
                            item.users?.full_name ??
                            (`${
                              item.first_name ?? item.users?.first_name ?? ""
                            } ${
                              item.last_name ?? item.users?.last_name ?? ""
                            }`.trim() ||
                              "—")}
                        </Text>
                      </div>
                      <div>
                        <Text c="dimmed">Email</Text>
                        <Text fw={700}>
                          {item.email ?? item.users?.email ?? "—"}
                        </Text>
                      </div>
                    </Group>

                    <Group justify="space-between">
                      <div>
                        <Text c="dimmed">Mobile</Text>
                        <Text fw={700}>
                          {item.mobile ?? item.users?.mobile ?? "—"}
                        </Text>
                      </div>
                      <div>
                        <Text c="dimmed">Telephone</Text>
                        <Text fw={700}>
                          {item.telephone ?? item.users?.telephone ?? "—"}
                        </Text>
                      </div>
                    </Group>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="plan">
                <Accordion.Control icon={<IconChevronDown size={16} />}>
                  Plan Details
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    <Text fw={700}>
                      <Text c="dimmed">Subscription Plan</Text>
                      {item.mailroom_plans?.name ?? item.plan ?? "—"}
                    </Text>

                    <Group justify="space-between">
                      <div>
                        <Text c="dimmed">Registration Location</Text>
                        <Text fw={700}>
                          {item.mailroom_locations?.name ?? "—"}
                        </Text>
                      </div>
                      <div>
                        <Text c="dimmed">Location Address</Text>
                        <Text fw={700}>
                          {[
                            item.mailroom_locations?.address,
                            item.mailroom_locations?.city,
                            item.mailroom_locations?.region,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </Text>
                      </div>
                    </Group>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <Divider />

            <Title order={5}>Packages</Title>
            <Paper withBorder p="sm">
              <ScrollArea style={{ maxHeight: 320 }}>
                <Table verticalSpacing="xs" style={{ fontSize: 13 }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Package</Table.Th>
                      <Table.Th>Locker</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Action</Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    {Array.isArray(item.packages) &&
                    item.packages.length > 0 ? (
                      item.packages.map((p: any) => {
                        const status = p.status ?? p.state ?? "PENDING";
                        const date =
                          p.status_date ?? p.created_at ?? p.updated_at;

                        return (
                          <Table.Tr key={p.id ?? p.label ?? Math.random()}>
                            <Table.Td>
                              {p.name ?? p.package_name ?? "—"}
                            </Table.Td>
                            <Table.Td>
                              {p.locker_label ?? p.locker ?? "—"}
                            </Table.Td>
                            <Table.Td>{status}</Table.Td>
                            <Table.Td>
                              {date ? new Date(date).toLocaleDateString() : "—"}
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                {status === "STORED" && (
                                  <>
                                    <Button size="xs" variant="outline">
                                      Request to Release
                                    </Button>
                                    <Button size="xs" variant="outline">
                                      Request to Dispose
                                    </Button>
                                    {p.type === "document" && (
                                      <Button size="xs">Request to Scan</Button>
                                    )}
                                  </>
                                )}
                                {status === "RELEASED" && (
                                  <>
                                    <Button size="xs">Confirm Received</Button>
                                    <Button size="xs">Proof of Release</Button>
                                  </>
                                )}
                                {status === "RETRIEVED" && (
                                  <Button size="xs">Proof of Release</Button>
                                )}
                                {[
                                  "DISPOSED",
                                  "REQUEST_TO_RELEASE",
                                  "REQUEST_TO_DISPOSE",
                                  "REQUEST_TO_SCAN",
                                ].includes(status) && (
                                  <Text size="xs" c="dimmed">
                                    {status}
                                  </Text>
                                )}
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })
                    ) : (
                      <Table.Tr>
                        <Table.Td colSpan={5}>
                          <Text c="dimmed">No packages</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </Stack>
        </Container>
      </main>
      <Footer />
    </Box>
  );
}
