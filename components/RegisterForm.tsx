import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Box,
  Paper,
  Grid,
  Group,
  Stack,
  TextInput,
  NumberInput,
  Textarea,
  Button,
  Card,
  Badge,
  Table,
  Radio,
  ScrollArea,
  Title,
  Text,
  SimpleGrid,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RegisterForm() {
  const router = useRouter();
  const { session } = useSession();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [lockerQty, setLockerQty] = useState<number | string>(1);
  const [months, setMonths] = useState<number | string>(12);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: locs } = await supabase
        .from("mailroom_locations")
        .select("id,name,region,city,barangay,zip")
        .order("name", { ascending: true });
      const { data: plns } = await supabase
        .from("mailroom_plans")
        .select("id,name,price")
        .order("name", { ascending: true });

      if (!mounted) return;
      if (locs) {
        setLocations(locs);
        if (!selectedLocation && locs.length) setSelectedLocation(locs[0].id);
      }
      if (plns) {
        const normalized = plns.map((p: any) => ({
          ...p,
          price: Number(p.price),
        }));
        setPlans(normalized);
        if (!selectedPlanId && normalized.length)
          setSelectedPlanId(normalized[0].id);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const pricePerMonth = selectedPlan ? Number(selectedPlan.price) : 0;
  const qty = typeof lockerQty === "number" ? lockerQty : 1;
  const duration = typeof months === "number" ? months : 1;
  const monthlyTotal = pricePerMonth * qty;
  const totalCost = monthlyTotal * duration;
  const format = (n: number) =>
    n.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) {
      router.push("/signin");
      return;
    }
    if (!selectedLocation || !selectedPlanId) {
      window.alert("Choose location and plan.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        userId: session.user.id,
        full_name: `${firstName} ${lastName}`.trim() || null,
        email,
        mobile,
        locationId: selectedLocation,
        planId: selectedPlanId,
        lockerQty: qty,
        months: duration,
        notes,
      };

      const res = await fetch("/api/mailroom/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("register error:", data);
        window.alert(data?.error || "Failed to register");
        return;
      }

      window.alert("Registered successfully");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      window.alert("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <Paper withBorder p="lg" radius="md" mb="md">
          <Group mb="md">
            <Badge color="blue" size="lg" circle>
              1
            </Badge>
            <Title order={4}>User Info</Title>
          </Group>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                type="email"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.currentTarget.value)}
              />
            </Grid.Col>
          </Grid>
        </Paper>

        <Paper withBorder p="lg" radius="md" mb="md">
          <Group mb="md">
            <Badge color="blue" size="lg" circle>
              2
            </Badge>
            <Title order={4}>Location & Plan</Title>
          </Group>

          <Stack gap="lg">
            <Box>
              <Text fw={600} mb="sm">
                Select Mailroom Location
              </Text>
              <ScrollArea style={{ maxHeight: 220 }} type="auto">
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Tbody>
                    {locations.map((loc) => (
                      <Table.Tr
                        key={loc.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedLocation(loc.id)}
                      >
                        <Table.Td style={{ width: 40 }}>
                          <Radio
                            checked={selectedLocation === loc.id}
                            onChange={() => setSelectedLocation(loc.id)}
                            value={loc.id}
                            name="mailroom-location"
                            style={{ cursor: "pointer" }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>{loc.name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {loc.city ?? loc.region}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Box>

            <Box>
              <Text fw={600} mb="sm">
                Select Your Plan
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {plans.map((p) => (
                  <Card
                    key={p.id}
                    withBorder
                    padding="lg"
                    radius="md"
                    style={{
                      borderColor:
                        selectedPlanId === p.id ? "#26316D" : undefined,
                      borderWidth: selectedPlanId === p.id ? 2 : 1,
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedPlanId(p.id)}
                  >
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={700}>{p.name}</Text>
                        {p.name === "Personal" && (
                          <Badge color="blue">Popular</Badge>
                        )}
                      </Group>
                      <Text size="xl" fw={700} c="#26316D">
                        {format(Number(p.price))}
                        <Text span size="sm" c="dimmed" fw={400}>
                          /mo
                        </Text>
                      </Text>
                      <Button
                        fullWidth
                        variant={selectedPlanId === p.id ? "filled" : "light"}
                        color={selectedPlanId === p.id ? "blue" : "gray"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlanId(p.id);
                        }}
                        mt="sm"
                      >
                        {selectedPlanId === p.id ? "Selected" : "Select"}
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </Box>
          </Stack>
        </Paper>

        <Paper withBorder p="lg" radius="md" mb="md">
          <Group mb="md">
            <Badge color="blue" size="lg" circle>
              3
            </Badge>
            <Title order={4}>Locker Info & Summary</Title>
          </Group>

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Locker Quantity"
                min={1}
                value={lockerQty}
                onChange={(val) => setLockerQty(val)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Number of Months"
                min={1}
                value={months}
                onChange={(val) => setMonths(val)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput label="Expiration" value="Calculated date" readOnly />
            </Grid.Col>
          </Grid>

          <Box mt="md">
            <Textarea
              label="Notes"
              placeholder="Additional instructions..."
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              minRows={3}
            />
          </Box>

          <Paper withBorder p="md" radius="md" mt="lg" bg="gray.0">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text c="dimmed">Price per locker / month:</Text>
                <Text fw={500}>{format(pricePerMonth)}</Text>
              </Group>
              <Group justify="space-between">
                <Text c="dimmed">Monthly total:</Text>
                <Text fw={500}>{format(monthlyTotal)}</Text>
              </Group>
              <Group
                justify="space-between"
                mt="sm"
                style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8 }}
              >
                <Text size="lg" fw={700}>
                  Total Due:
                </Text>
                <Text size="lg" fw={700} c="#26316D">
                  {format(totalCost)}
                </Text>
              </Group>
            </Stack>
          </Paper>

          <Group justify="flex-end" mt="xl">
            <Button
              type="submit"
              size="lg"
              loading={loading}
              style={{ backgroundColor: "#26316D", color: "#fff" }}
            >
              Submit Registration
            </Button>
          </Group>
        </Paper>
      </form>
    </Box>
  );
}
