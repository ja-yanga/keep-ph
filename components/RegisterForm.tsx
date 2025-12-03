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
  Radio,
  ScrollArea,
  Title,
  Text,
  SimpleGrid,
  Modal,
  Divider,
  Alert,
  Stepper,
  ThemeIcon,
  SegmentedControl,
  ActionIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import {
  IconAlertCircle,
  IconCheck,
  IconUser,
  IconMapPin,
  IconBox,
  IconCreditCard,
  IconChevronRight,
  IconChevronLeft,
  IconCalendar,
} from "@tabler/icons-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RegisterForm() {
  const router = useRouter();
  const { session } = useSession();

  // Modal state
  const [opened, { open, close }] = useDisclosure(false);

  // Form Data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [telephone, setTelephone] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [lockerQty, setLockerQty] = useState<number | string>(1);

  // NEW: State to store available locker counts per location
  const [locationAvailability, setLocationAvailability] = useState<
    Record<string, number>
  >({});

  // NEW: Billing Cycle State
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly"
  );
  const [months, setMonths] = useState<number>(1); // Default to 1 month

  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState("");

  // NEW: Referral State
  const [referralValid, setReferralValid] = useState(false);
  const [referralMessage, setReferralMessage] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Update months when billing cycle changes
  useEffect(() => {
    if (billingCycle === "annual") {
      setMonths(12);
    } else {
      setMonths(1);
    }
  }, [billingCycle]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      // 1. Fetch Locations
      const { data: locs } = await supabase
        .from("mailroom_locations")
        .select("id,name,region,city,barangay,zip")
        .order("name", { ascending: true });

      // 2. Fetch Plans
      const { data: plns } = await supabase
        .from("mailroom_plans")
        .select("id,name,price,description")
        .order("price", { ascending: true });

      // 3. Fetch Available Locker Counts from API
      let counts: Record<string, number> = {};
      try {
        const res = await fetch("/api/mailroom/locations/availability");
        if (res.ok) {
          counts = await res.json();
        } else {
          console.error("Failed to fetch availability");
        }
      } catch (err) {
        console.error("Error fetching availability:", err);
      }

      if (!mounted) return;

      if (locs) setLocations(locs);
      if (plns) {
        const normalized = plns.map((p: any) => ({
          ...p,
          price: Number(p.price),
        }));
        setPlans(normalized);
      }

      // Set the counts directly from API response
      setLocationAvailability(counts);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Derived State
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const selectedLocationObj =
    locations.find((l) => l.id === selectedLocation) ?? null;
  // Get available count for selected location
  const availableCount = selectedLocation
    ? locationAvailability[selectedLocation] || 0
    : 0;

  const basePrice = selectedPlan ? Number(selectedPlan.price) : 0;
  const qty = typeof lockerQty === "number" ? lockerQty : 1;

  // Calculate totals
  // 1. Base Calculation
  const displayedPlanPrice =
    billingCycle === "annual" ? basePrice * 12 * 0.8 : basePrice;

  const subTotal = displayedPlanPrice * qty;

  // 2. Apply Referral Discount (5%)
  const referralDiscountAmount = referralValid ? subTotal * 0.05 : 0;

  // 3. Final Total
  const totalCost = subTotal - referralDiscountAmount;

  // Helper to calculate original price for comparison
  const originalAnnualPrice = basePrice * 12;

  const format = (n: number) =>
    n.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    });

  // NEW: Validate Referral Function
  const validateReferral = async () => {
    if (!referralCode.trim()) return;

    setValidatingCode(true);
    setReferralMessage("");
    setReferralValid(false);

    try {
      const res = await fetch("/api/referrals/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: referralCode.trim(),
          currentUserId: session?.user?.id,
        }),
      });

      const data = await res.json();
      setReferralValid(data.valid);
      setReferralMessage(data.message);
    } catch (err) {
      setReferralMessage("Error validating code");
    } finally {
      setValidatingCode(false);
    }
  };

  // Navigation Handlers
  const nextStep = () => {
    setError(null);
    if (active === 0 && !selectedPlanId) {
      setError("Please select a plan to continue.");
      return;
    }
    if (active === 1) {
      if (!selectedLocation) {
        setError("Please select a location to continue.");
        return;
      }

      const qtyNum = Number(lockerQty);
      if (qtyNum < 1) {
        setError("Please enter a valid locker quantity.");
        return;
      }

      // NEW: Validation for max availability
      if (qtyNum > availableCount) {
        setError(
          `Only ${availableCount} locker(s) available at this location.`
        );
        return;
      }
    }
    if (active === 2) {
      if (!firstName || !lastName || !email || !mobile) {
        setError("Please fill in all required fields.");
        return;
      }

      // NEW: Mobile Validation (PH format: 09xxxxxxxxx)
      if (!/^09\d{9}$/.test(mobile)) {
        setError(
          "Invalid mobile number. Must be 11 digits starting with 09 (e.g., 09123456789)."
        );
        return;
      }

      // NEW: Telephone Validation (7-8 digits)
      if (telephone && !/^\d{7,8}$/.test(telephone)) {
        setError("Invalid telephone number. Must be 7 or 8 digits.");
        return;
      }
    }
    setActive((current) => (current < 3 ? current + 1 : current));
  };

  const prevStep = () =>
    setActive((current) => (current > 0 ? current - 1 : current));

  // Submission Logic
  const handleConfirm = async () => {
    if (!session?.user?.id) {
      router.push("/signin");
      return;
    }

    const profile = session?.profile as any;
    if (
      referralCode.trim() &&
      profile?.referral_code &&
      referralCode.trim() === profile.referral_code
    ) {
      setError("You cannot use your own referral code.");
      return;
    }

    open();
  };

  const submitRegistration = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        userId: session?.user?.id,
        full_name: `${firstName} ${lastName}`.trim() || null,
        email,
        mobile,
        telephone,
        locationId: selectedLocation,
        planId: selectedPlanId,
        lockerQty: qty,
        months: months, // This is now controlled by the toggle (1 or 12)
        notes,
        referralCode: referralValid ? referralCode : null,
      };

      const res = await fetch("/api/mailroom/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to register");
        close();
        return;
      }

      if (referralCode.trim()) {
        try {
          await fetch("/api/referrals/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              referral_code: referralCode.trim(),
              referred_email: email,
              service_type: "Mailroom Subscription",
            }),
          });
        } catch (refErr) {
          console.error("Error processing referral:", refErr);
        }
      }

      close();
      setSuccess("Registered successfully! Redirecting...");

      // Scroll to top to ensure the success alert is visible
      window.scrollTo({ top: 0, behavior: "smooth" });

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
      close();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Alerts */}
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
          <Text c="dimmed" size="sm">
            Please review your subscription details.
          </Text>
          <Paper withBorder p="md" bg="gray.0" radius="md">
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
                <Text fw={600}>Billing Cycle:</Text>
                <Badge color={billingCycle === "annual" ? "orange" : "blue"}>
                  {billingCycle === "annual" ? "Annual (12 Months)" : "Monthly"}
                </Badge>
              </Group>
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
              onClick={submitRegistration}
              loading={loading}
              color="blue"
              style={{ backgroundColor: "#26316D" }}
            >
              Confirm & Pay
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Grid gutter="xl">
        {/* LEFT COLUMN: STEPPER */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stepper
            active={active}
            onStepClick={setActive}
            color="#26316D"
            iconSize={32}
          >
            {/* STEP 1: PLAN & CONFIG */}
            <Stepper.Step
              label="Plan"
              description="Select package"
              icon={<IconBox size={18} />}
            >
              <Stack mt="lg">
                <Group justify="space-between" align="center">
                  <Title order={4}>1. Select Your Plan</Title>

                  {/* NEW: Billing Cycle Toggle */}
                  <SegmentedControl
                    value={billingCycle}
                    onChange={(val) =>
                      setBillingCycle(val as "monthly" | "annual")
                    }
                    data={[
                      { label: "Monthly", value: "monthly" },
                      { label: "Annual", value: "annual" },
                    ]}
                    color="#26316D"
                    radius="md"
                  />
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {plans.map((p) => {
                    // Calculate display price based on cycle
                    // CHANGED: Apply 20% discount for annual
                    const displayPrice =
                      billingCycle === "annual" ? p.price * 12 * 0.8 : p.price;
                    const originalPrice = p.price * 12;

                    return (
                      <Card
                        key={p.id}
                        withBorder
                        padding="lg"
                        radius="md"
                        onClick={() => setSelectedPlanId(p.id)}
                        style={{
                          cursor: "pointer",
                          borderColor:
                            selectedPlanId === p.id ? "#26316D" : undefined,
                          borderWidth: selectedPlanId === p.id ? 2 : 1,
                          backgroundColor:
                            selectedPlanId === p.id
                              ? "var(--mantine-color-blue-0)"
                              : undefined,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Group
                          justify="space-between"
                          align="flex-start"
                          mb="xs"
                        >
                          <Badge
                            color={selectedPlanId === p.id ? "blue" : "gray"}
                            variant="light"
                          >
                            {p.name}
                          </Badge>
                          {selectedPlanId === p.id && (
                            <ThemeIcon color="blue" radius="xl" size="sm">
                              <IconCheck size={12} />
                            </ThemeIcon>
                          )}
                        </Group>

                        <Stack gap={0} mb="xs">
                          {billingCycle === "annual" && (
                            <Text
                              size="sm"
                              c="dimmed"
                              td="line-through"
                              style={{ lineHeight: 1 }}
                            >
                              {format(originalPrice)}
                            </Text>
                          )}
                          <Text size="xl" fw={700} c="#26316D">
                            {format(displayPrice)}
                            <Text span size="sm" c="dimmed" fw={400}>
                              /{billingCycle === "annual" ? "yr" : "mo"}
                            </Text>
                          </Text>
                          {billingCycle === "annual" && (
                            <Badge
                              size="sm"
                              variant="filled"
                              color="green"
                              mt={4}
                              w="fit-content"
                            >
                              SAVE 20%
                            </Badge>
                          )}
                        </Stack>

                        <Text size="sm" c="dimmed" style={{ lineHeight: 1.4 }}>
                          {p.description}
                        </Text>
                      </Card>
                    );
                  })}
                </SimpleGrid>

                {/* REMOVED: Configuration Section from Step 1 */}
              </Stack>
            </Stepper.Step>

            {/* STEP 2: LOCATION */}
            <Stepper.Step
              label="Location"
              description="Choose branch"
              icon={<IconMapPin size={18} />}
            >
              <Stack mt="lg">
                <Title order={4}>Select Mailroom Location</Title>
                <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
                  <ScrollArea h={300}>
                    {locations.map((loc, index) => {
                      const count = locationAvailability[loc.id] || 0;
                      const isFull = count === 0;

                      return (
                        <Box
                          key={loc.id}
                          p="md"
                          onClick={() => !isFull && setSelectedLocation(loc.id)}
                          style={{
                            cursor: isFull ? "not-allowed" : "pointer",
                            borderBottom:
                              index !== locations.length - 1
                                ? "1px solid var(--mantine-color-gray-2)"
                                : "none",
                            backgroundColor:
                              selectedLocation === loc.id
                                ? "var(--mantine-color-blue-0)"
                                : isFull
                                ? "var(--mantine-color-gray-0)"
                                : "transparent",
                            opacity: isFull ? 0.6 : 1,
                          }}
                        >
                          <Group justify="space-between">
                            <Group>
                              <Radio
                                checked={selectedLocation === loc.id}
                                onChange={() => {}}
                                readOnly
                                disabled={isFull}
                                style={{ pointerEvents: "none" }}
                              />
                              <div>
                                <Text fw={500}>{loc.name}</Text>
                                <Text size="sm" c="dimmed">
                                  {loc.city ?? loc.region}
                                </Text>
                              </div>
                            </Group>
                            <Badge
                              color={
                                isFull ? "red" : count < 5 ? "orange" : "green"
                              }
                              variant="light"
                            >
                              {isFull ? "FULL" : `${count} Available Lockers`}
                            </Badge>
                          </Group>
                        </Box>
                      );
                    })}
                  </ScrollArea>
                </Paper>

                {/* MOVED: Locker Quantity Input to Step 2 */}
                {selectedLocation && (
                  <>
                    <Divider
                      my="sm"
                      label="Availability & Quantity"
                      labelPosition="center"
                    />
                    <Paper
                      withBorder
                      p="lg"
                      radius="md"
                      mt="md"
                      bg="var(--mantine-color-blue-0)"
                    >
                      <Group justify="space-between">
                        <div>
                          <Text fw={600} size="lg" c="#26316D">
                            How many lockers?
                          </Text>
                          <Text size="sm" c="dimmed">
                            Max available:{" "}
                            <Text span fw={700}>
                              {availableCount}
                            </Text>
                          </Text>
                        </div>
                        <Group gap="xs">
                          <ActionIcon
                            size="xl"
                            variant="default"
                            onClick={() =>
                              setLockerQty(Math.max(1, Number(lockerQty) - 1))
                            }
                            disabled={Number(lockerQty) <= 1}
                          >
                            -
                          </ActionIcon>
                          <NumberInput
                            variant="unstyled"
                            min={1}
                            max={availableCount}
                            value={lockerQty}
                            onChange={(val) => setLockerQty(val)}
                            styles={{
                              input: {
                                width: 40,
                                textAlign: "center",
                                fontSize: 20,
                                fontWeight: 700,
                              },
                            }}
                            hideControls
                          />
                          <ActionIcon
                            size="xl"
                            variant="filled"
                            color="#26316D"
                            onClick={() =>
                              setLockerQty(
                                Math.min(availableCount, Number(lockerQty) + 1)
                              )
                            }
                            disabled={Number(lockerQty) >= availableCount}
                          >
                            +
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Paper>
                  </>
                )}
              </Stack>
            </Stepper.Step>

            {/* STEP 3: DETAILS */}
            <Stepper.Step
              label="Details"
              description="Personal info"
              icon={<IconUser size={18} />}
            >
              <Stack mt="lg">
                <Title order={4}>User Information</Title>
                <Paper withBorder p="lg" radius="md">
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
                        placeholder="09xxxxxxxxx"
                        value={mobile}
                        onChange={(e) => {
                          // Only allow numbers, max 11 chars
                          const val = e.currentTarget.value.replace(/\D/g, "");
                          if (val.length <= 11) setMobile(val);
                        }}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Telephone (Optional)"
                        placeholder="7 or 8 digits"
                        value={telephone}
                        onChange={(e) => {
                          // Only allow numbers, max 8 chars
                          const val = e.currentTarget.value.replace(/\D/g, "");
                          if (val.length <= 8) setTelephone(val);
                        }}
                      />
                    </Grid.Col>
                  </Grid>
                </Paper>
              </Stack>
            </Stepper.Step>

            {/* STEP 4: REVIEW */}
            <Stepper.Step
              label="Review"
              description="Finalize"
              icon={<IconCreditCard size={18} />}
            >
              <Stack mt="lg">
                <Title order={4}>Final Review</Title>
                <Text c="dimmed" size="sm">
                  Please verify your personal information before proceeding to
                  payment.
                </Text>

                {/* REMOVED: Subscription Details Paper (Redundant with Sidebar) */}

                {/* Subscriber Information Section */}
                <Paper withBorder p="lg" radius="md">
                  <Group justify="space-between" mb="md">
                    <Title order={6} c="dimmed" tt="uppercase">
                      Subscriber Information
                    </Title>
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => setActive(2)} // Jump back to Details step
                    >
                      Edit
                    </Button>
                  </Group>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text c="dimmed">Full Name:</Text>
                      <Text fw={600}>
                        {firstName} {lastName}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text c="dimmed">Email:</Text>
                      <Text fw={600}>{email}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text c="dimmed">Mobile Number:</Text>
                      <Text fw={600}>{mobile}</Text>
                    </Group>
                    {telephone && (
                      <Group justify="space-between">
                        <Text c="dimmed">Telephone:</Text>
                        <Text fw={600}>{telephone}</Text>
                      </Group>
                    )}
                  </Stack>
                </Paper>

                {/* Additional Info Section */}
                <Paper withBorder p="lg" radius="md">
                  <Group align="flex-end">
                    <TextInput
                      label="Referral Code (Optional)"
                      placeholder="Enter code"
                      value={referralCode}
                      onChange={(e) => {
                        setReferralCode(e.currentTarget.value);
                        // Reset validation if user types new code
                        if (referralValid) {
                          setReferralValid(false);
                          setReferralMessage("");
                        }
                      }}
                      error={
                        !referralValid && referralMessage
                          ? referralMessage
                          : null
                      }
                      style={{ flex: 1 }}
                    />
                    <Button
                      variant="light"
                      onClick={validateReferral}
                      loading={validatingCode}
                      disabled={!referralCode || referralValid}
                    >
                      {referralValid ? "Applied" : "Apply"}
                    </Button>
                  </Group>
                  {referralValid && (
                    <Text c="teal" size="xs" mt={4}>
                      <IconCheck
                        size={12}
                        style={{ display: "inline", marginRight: 4 }}
                      />
                      {referralMessage}
                    </Text>
                  )}

                  <Textarea
                    mt="md"
                    label="Notes"
                    placeholder="Additional instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.currentTarget.value)}
                    minRows={3}
                  />
                </Paper>

                {/* Payment Notice */}
                <Alert
                  icon={<IconCreditCard size={16} />}
                  color="blue"
                  variant="light"
                >
                  By clicking "Proceed to Payment", you will be redirected to
                  our secure payment gateway to complete your transaction.
                </Alert>
              </Stack>
            </Stepper.Step>

            <Stepper.Completed>
              <Stack align="center" mt="xl">
                <ThemeIcon size={60} radius="xl" color="teal" variant="light">
                  <IconCheck size={34} />
                </ThemeIcon>
                <Title order={3}>Registration Complete!</Title>
                <Text c="dimmed" ta="center" maw={400}>
                  Your subscription has been successfully created. You will be
                  redirected to your dashboard shortly.
                </Text>
              </Stack>
            </Stepper.Completed>
          </Stepper>

          {/* Navigation Buttons */}
          {active < 4 && (
            <Group justify="space-between" mt="xl">
              <Button
                variant="default"
                onClick={prevStep}
                disabled={active === 0}
                leftSection={<IconChevronLeft size={16} />}
              >
                Back
              </Button>
              {active === 3 ? (
                <Button
                  onClick={handleConfirm}
                  color="blue"
                  style={{ backgroundColor: "#26316D" }}
                  size="md"
                >
                  Proceed to Payment
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  color="blue"
                  style={{ backgroundColor: "#26316D" }}
                  rightSection={<IconChevronRight size={16} />}
                >
                  Next Step
                </Button>
              )}
            </Group>
          )}
        </Grid.Col>

        {/* RIGHT COLUMN: STICKY SUMMARY */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper
            withBorder
            p="xl"
            radius="md"
            shadow="sm"
            style={{ position: "sticky", top: 20 }}
          >
            <Title order={4} mb="lg">
              Order Summary
            </Title>
            <Stack gap="md">
              <Group justify="space-between">
                <Text c="dimmed">Plan</Text>
                <Text fw={500}>{selectedPlan?.name || "—"}</Text>
              </Group>
              <Group justify="space-between">
                <Text c="dimmed">Location</Text>
                <Text
                  fw={500}
                  style={{ maxWidth: 150, textAlign: "right" }}
                  lineClamp={1}
                >
                  {selectedLocationObj?.name || "—"}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text c="dimmed">Cycle</Text>
                <Group gap={6}>
                  <Text fw={500}>
                    {billingCycle === "annual" ? "Annual (12 Mo)" : "Monthly"}
                  </Text>
                  {billingCycle === "annual" && (
                    <Badge size="xs" color="green" variant="light">
                      -20%
                    </Badge>
                  )}
                </Group>
              </Group>
              <Group justify="space-between">
                <Text c="dimmed">Quantity</Text>
                <Text fw={500}>
                  {qty} Locker{qty > 1 ? "s" : ""}
                </Text>
              </Group>

              <Divider my="sm" />

              {/* NEW: Subtotal and Discount Rows */}
              {referralValid && (
                <>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Subtotal
                    </Text>
                    <Text size="sm">{format(subTotal)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="green">
                      Referral Discount (5%)
                    </Text>
                    <Text size="sm" c="green">
                      -{format(referralDiscountAmount)}
                    </Text>
                  </Group>
                  <Divider my="sm" />
                </>
              )}

              <Group justify="space-between">
                <Text size="lg" fw={700}>
                  Total
                </Text>
                <Text
                  size="xl"
                  fw={700}
                  c={selectedPlan ? "#26316D" : "dimmed"}
                >
                  {selectedPlan ? format(totalCost) : "—"}
                </Text>
              </Group>

              {/* REMOVED: The redundant button here. 
                  We only show it if NOT on the final step, or remove it entirely 
                  to rely on the main navigation flow. 
              */}

              <Group justify="center" gap="xs" mt="xs">
                <IconCreditCard size={14} color="gray" />
                <Text size="xs" c="dimmed">
                  Secure SSL Encryption
                </Text>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
