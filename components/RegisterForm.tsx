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
  const [lockerQty, setLockerQty] = useState<number | undefined>(1);
  const [months, setMonths] = useState<number | undefined>(12);
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
  const qty = lockerQty ?? 1;
  const duration = months ?? 1;
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
        firstName,
        lastName,
        email,
        mobile,
        locationId: selectedLocation,
        planId: selectedPlanId,
        lockerQty,
        months,
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
            <Badge color="blue">1</Badge>
            <Title order={4}>User Info</Title>
          </Group>
          <Grid>
            <Grid.Col md={6}>
              <TextInput
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col md={6}>
              <TextInput
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col md={6}>
              <TextInput
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                type="email"
              />
            </Grid.Col>
            <Grid.Col md={6}>
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
            <Badge color="blue">2</Badge>
            <Title order={4}>Location & Plan</Title>
          </Group>

          <Stack spacing="lg">
            <Box>
              <Text weight={600} mb="sm">
                Select Mailroom Location
              </Text>
              <ScrollArea style={{ maxHeight: 220 }}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <tbody>
                    {locations.map((loc) => (
                      <tr key={loc.id}>
                        <td style={{ width: 40 }}>
                          <Radio
                            checked={selectedLocation === loc.id}
                            onChange={() => setSelectedLocation(loc.id)}
                            value={loc.id}
                            name="mailroom-location"
                          />
                        </td>
                        <td>{loc.name}</td>
                        <td>{loc.city ?? loc.region}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>
            </Box>

            <Box>
              <Text weight={600} mb="sm">
                Select Your Plan
              </Text>
              <Grid>
                {plans.map((p) => (
                  <Grid.Col key={p.id} xs={12} md={6} lg={4}>
                    <Card
                      withBorder
                      style={{
                        borderColor:
                          selectedPlanId === p.id ? "#26316D" : undefined,
                      }}
                    >
                      <Stack>
                        {p.name === "Personal" ? (
                          <Badge color="blue">Popular</Badge>
                        ) : null}
                        <Text weight={700}>{p.name}</Text>
                        <Text weight={700} size="xl">
                          {format(Number(p.price))}/month
                        </Text>
                        <Button
                          variant={
                            selectedPlanId === p.id ? "filled" : "outline"
                          }
                          onClick={() => setSelectedPlanId(p.id)}
                        >
                          Select
                        </Button>
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            </Box>
          </Stack>
        </Paper>

        <Paper withBorder p="lg" radius="md" mb="md">
          <Group mb="md">
            <Badge color="blue">3</Badge>
            <Title order={4}>Locker Info & Summary</Title>
          </Group>

          <Grid>
            <Grid.Col md={4}>
              <NumberInput
                label="Locker Quantity"
                min={1}
                value={lockerQty}
                onChange={(val) => setLockerQty(val)}
              />
            </Grid.Col>
            <Grid.Col md={4}>
              <NumberInput
                label="Number of Months"
                min={1}
                value={months}
                onChange={(val) => setMonths(val)}
              />
            </Grid.Col>
            <Grid.Col md={4}>
              <TextInput label="Expiration" value="Calculated date" readOnly />
            </Grid.Col>
          </Grid>

          <Box mt="md">
            <Textarea
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              minRows={3}
            />
          </Box>

          <Box mt="md">
            <Text>
              Price per locker / month:{" "}
              <Text component="span" weight={700}>
                {format(pricePerMonth)}
              </Text>
            </Text>
            <Text>
              Monthly total:{" "}
              <Text component="span" weight={700}>
                {format(monthlyTotal)}
              </Text>
            </Text>
            <Text>
              Total:{" "}
              <Text component="span" weight={700}>
                {format(totalCost)}
              </Text>
            </Text>
          </Box>

          <Group position="right" mt="md">
            <Button
              type="submit"
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
