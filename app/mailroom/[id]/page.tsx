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

  // local locker management (UI only)
  const addLocker = () => {
    if (!item) return;
    const lockers = item.lockers ?? [];
    const newLocker = {
      id: `local-${Date.now()}`,
      label: `L${String(Date.now()).slice(-4)}`,
      status: "AVAILABLE",
      removal_date: null,
    };
    item.lockers = [...lockers, newLocker];
    setItem({ ...item });
  };

  const removeLocker = (lockerId: string) => {
    if (!item?.lockers) return;
    item.lockers = item.lockers.map((L: any) =>
      L.id === lockerId
        ? { ...L, status: "REMOVED", removal_date: new Date().toISOString() }
        : L
    );
    setItem({ ...item });
  };

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
          <Text color="red">{error ?? "Not found"}</Text>
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
          <Group position="apart" align="center" mb="md">
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

          <Stack spacing="md">
            <Group position="apart">
              <Text color="dimmed">Locker Status</Text>
              <Badge color={item.locker_status ? "gray" : "yellow"}>
                {item.locker_status ?? "—"}
              </Badge>
            </Group>

            <Group position="apart">
              <Text color="dimmed">Subscription Expiry</Text>
              <Text weight={700}>
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
                  <Stack spacing="sm">
                    <Group position="apart">
                      <Text color="dimmed">Date Created</Text>
                      <Text>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "—"}
                      </Text>
                    </Group>
                    <Group position="apart">
                      <Text color="dimmed">Locker Quantity</Text>
                      <Text>
                        {item.locker_qty ?? item.lockers?.length ?? "—"}
                      </Text>
                    </Group>

                    <Paper withBorder p="sm">
                      <Text weight={700} mb="xs">
                        Lockers
                      </Text>
                      <ScrollArea style={{ maxHeight: 260 }}>
                        <Table verticalSpacing="xs" sx={{ fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th>Label</th>
                              <th>Status</th>
                              <th>Removal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(item.lockers) &&
                            item.lockers.length > 0 ? (
                              item.lockers.map((L: any) => (
                                <tr key={L.id}>
                                  <td>{L.label}</td>
                                  <td>{L.status}</td>
                                  <td>
                                    {L.status !== "REMOVED" ? (
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={() => removeLocker(L.id)}
                                      >
                                        Remove
                                      </Button>
                                    ) : (
                                      <Text size="xs" color="dimmed">
                                        {L.removal_date
                                          ? new Date(
                                              L.removal_date
                                            ).toLocaleDateString()
                                          : "Removed"}
                                      </Text>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3}>
                                  <Text color="dimmed">No lockers</Text>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </ScrollArea>
                      <Group position="right" mt="xs">
                        <Button size="xs" onClick={addLocker}>
                          Add Locker
                        </Button>
                      </Group>
                    </Paper>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="user">
                <Accordion.Control icon={<IconChevronDown size={16} />}>
                  User Details
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack spacing="xs">
                    <Group direction="column" spacing={4}>
                      <Text color="dimmed">Account Number</Text>
                      <Text weight={700}>{accountNumber}</Text>
                    </Group>

                    <Group position="apart">
                      <div>
                        <Text color="dimmed">Full Name</Text>
                        <Text weight={700}>
                          {item.user_name ??
                            (`${item.first_name ?? ""} ${
                              item.last_name ?? ""
                            }`.trim() ||
                              "—")}
                        </Text>
                      </div>
                      <div>
                        <Text color="dimmed">Email</Text>
                        <Text weight={700}>{item.email ?? "—"}</Text>
                      </div>
                    </Group>

                    <Group position="apart">
                      <div>
                        <Text color="dimmed">Mobile</Text>
                        <Text weight={700}>{item.mobile ?? "—"}</Text>
                      </div>
                      <div>
                        <Text color="dimmed">Telephone</Text>
                        <Text weight={700}>{item.telephone ?? "—"}</Text>
                      </div>
                    </Group>

                    <Group position="right">
                      <Button size="xs" variant="outline">
                        Edit User Details
                      </Button>
                    </Group>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="plan">
                <Accordion.Control icon={<IconChevronDown size={16} />}>
                  Plan Details
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack spacing="sm">
                    <Text weight={700}>
                      {item.mailroom_plans?.name ?? item.plan ?? "—"}
                    </Text>
                    <Text color="dimmed">
                      {item.mailroom_plans?.description ??
                        item.plan_description ??
                        "—"}
                    </Text>

                    <Group position="apart">
                      <div>
                        <Text color="dimmed">Registration Location</Text>
                        <Text weight={700}>
                          {item.mailroom_locations?.name ?? "—"}
                        </Text>
                      </div>
                      <div>
                        <Text color="dimmed">Location Address</Text>
                        <Text weight={700}>
                          {`${accountNumber} ${
                            item.mailroom_locations?.city ?? ""
                          } ${item.mailroom_locations?.region ?? ""}`.trim() ||
                            "—"}
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
                <Table verticalSpacing="xs" sx={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Locker</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(item.packages) &&
                    item.packages.length > 0 ? (
                      item.packages.map((p: any) => {
                        const status = p.status ?? p.state ?? "PENDING";
                        const date =
                          p.status_date ?? p.created_at ?? p.updated_at;
                        return (
                          <tr key={p.id ?? p.label ?? Math.random()}>
                            <td>{p.name ?? p.package_name ?? "—"}</td>
                            <td>{p.locker_label ?? p.locker ?? "—"}</td>
                            <td>{status}</td>
                            <td>
                              {date ? new Date(date).toLocaleDateString() : "—"}
                            </td>
                            <td>
                              <Group spacing="xs">
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
                                  <Text size="xs" color="dimmed">
                                    {status}
                                  </Text>
                                )}
                              </Group>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          <Text color="dimmed">No packages</Text>
                        </td>
                      </tr>
                    )}
                  </tbody>
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
