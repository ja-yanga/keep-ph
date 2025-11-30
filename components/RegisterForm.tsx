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
  Modal,
  Divider,
  Alert, // Add Alert
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react"; // Add Icons

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RegisterForm() {
  const router = useRouter();
  const { session } = useSession();

  // Modal state
  const [opened, { open, close }] = useDisclosure(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [telephone, setTelephone] = useState(""); // Add telephone state
  const [locations, setLocations] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [lockerQty, setLockerQty] = useState<number | string>(1);
  const [months, setMonths] = useState<number | string>(12);
  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState(""); // New State
  const [loading, setLoading] = useState(false);

  // UI States
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: locs } = await supabase
        .from("mailroom_locations")
        .select("id,name,region,city,barangay,zip")
        .order("name", { ascending: true });

      // CHANGED: Order by price ascending (lowest to highest)
      const { data: plns } = await supabase
        .from("mailroom_plans")
        .select("id,name,price,description")
        .order("price", { ascending: true });

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
  const selectedLocationObj =
    locations.find((l) => l.id === selectedLocation) ?? null;

  const pricePerMonth = selectedPlan ? Number(selectedPlan.price) : 0;
  const qty = typeof lockerQty === "number" ? lockerQty : 1;
  const duration = typeof months === "number" ? months : 1;
  const monthlyTotal = pricePerMonth * qty;
  const totalCost = monthlyTotal * duration;

  // Calculate expiration date
  const expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() + duration);
  const formattedExpiration = expirationDate.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const format = (n: number) =>
    n.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    });

  // 1. Triggered by the form "Submit" button
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!session?.user?.id) {
      router.push("/signin");
      return;
    }
    if (!selectedLocation || !selectedPlanId) {
      setError("Please choose a location and a plan.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Check if user is trying to use their own referral code
    // Cast to any to bypass strict type check for referral_code
    const profile = session?.profile as any;
    if (
      referralCode.trim() &&
      profile?.referral_code &&
      referralCode.trim() === profile.referral_code
    ) {
      setError("You cannot use your own referral code.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Open the confirmation modal
    open();
  };

  // 2. Triggered by the "Confirm" button inside the modal
  const confirmRegistration = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Register the subscription
      const payload = {
        userId: session?.user?.id,
        full_name: `${firstName} ${lastName}`.trim() || null,
        email,
        mobile,
        telephone, // Add telephone to payload
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
        setError(data?.error || "Failed to register");
        close(); // Close modal on error
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // 2. Handle Referral (if code provided)
      if (referralCode.trim()) {
        try {
          // CHANGED: Send code directly to API instead of looking up ID on client
          await fetch("/api/referrals/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              referral_code: referralCode.trim(), // Send code
              referred_email: email,
              service_type: "Mailroom Subscription",
            }),
          });
        } catch (refErr) {
          console.error("Error processing referral:", refErr);
          // Don't block success flow if referral fails
        }
      }

      close(); // Close modal on success
      setSuccess("Registered successfully! Redirecting to dashboard...");
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Delay redirect so user sees the success message
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
      close();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          mb="md"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          icon={<IconCheck size={16} />}
          title="Success"
          color="teal"
          mb="md"
        >
          {success}
        </Alert>
      )}

      {/* Confirmation Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title="Confirm Subscription"
        centered
        size="md"
      >
        <Stack gap="md">
          <Text c="dimmed">
            Please review your subscription details before confirming.
          </Text>

          <Paper withBorder p="md" bg="gray.0">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={600}>Location:</Text>
                <Text>{selectedLocationObj?.name}</Text>
              </Group>
              <Group justify="space-between">
                <Text fw={600}>Plan:</Text>
                <Text>{selectedPlan?.name}</Text>
              </Group>
              <Group justify="space-between">
                <Text fw={600}>Duration:</Text>
                <Text>
                  {duration} Month{duration > 1 ? "s" : ""}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text fw={600}>Quantity:</Text>
                <Text>
                  {qty} Locker{qty > 1 ? "s" : ""}
                </Text>
              </Group>
              {referralCode && (
                <Group justify="space-between">
                  <Text fw={600}>Referral Code:</Text>
                  <Badge color="teal">{referralCode}</Badge>
                </Group>
              )}
              <Divider my="xs" />
              <Group justify="space-between">
                <Text size="lg" fw={700}>
                  Total Due:
                </Text>
                <Text size="lg" fw={700} c="#26316D">
                  {format(totalCost)}
                </Text>
              </Group>
            </Stack>
          </Paper>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={confirmRegistration}
              loading={loading}
              style={{ backgroundColor: "#26316D", color: "#fff" }}
            >
              Confirm & Pay
            </Button>
          </Group>
        </Stack>
      </Modal>

      <form onSubmit={handleFormSubmit}>
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
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.currentTarget.value)}
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                type="email"
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.currentTarget.value)}
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Telephone (Optional)"
                value={telephone}
                onChange={(e) => setTelephone(e.currentTarget.value)}
                placeholder="Landline or alternative number"
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
                Select Mailroom Location{" "}
                <Text span c="red">
                  *
                </Text>
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
                Select Your Plan{" "}
                <Text span c="red">
                  *
                </Text>
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
                      <Text>{p.description}</Text>
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
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput
                label="Locker Quantity"
                min={1}
                value={lockerQty}
                onChange={(val) => setLockerQty(val)}
                required // CHANGED: Added required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput
                label="Number of Months"
                min={1}
                value={months}
                onChange={(val) => setMonths(val)}
                required
              />
            </Grid.Col>
            {/* <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput label="Expiration" value="Calculated date" readOnly />
            </Grid.Col> */}
          </Grid>

          <Box mt="md">
            <TextInput
              label="Referral Code (Optional)"
              placeholder="Enter code if you have one"
              value={referralCode}
              onChange={(e) => setReferralCode(e.currentTarget.value)}
            />
          </Box>

          <Box mt="md">
            <Textarea
              label="Notes"
              placeholder="Additional instructions..."
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              minRows={3}
              // Notes remains optional
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
              // loading removed here, moved to modal button
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
