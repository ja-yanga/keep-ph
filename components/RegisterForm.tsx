"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  Loader,
  Center,
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
  IconMail,
  IconPackage,
  IconScan,
} from "@tabler/icons-react";

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

  const [locations, setLocations] = useState<
    Array<{ id: string; name: string; city?: string; region?: string }>
  >([]);
  const [plans, setPlans] = useState<
    Array<{
      id: string;
      name: string;
      price: number;
      can_receive_mail?: boolean;
      can_receive_parcels?: boolean;
      storage_limit?: number;
      can_digitize?: boolean;
      description?: string;
    }>
  >([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [lockerQty, setLockerQty] = useState<number | string>(1);

  // NEW: State to store available locker counts per location
  const [locationAvailability, setLocationAvailability] = useState<
    Record<string, number>
  >({});

  // NEW: Billing Cycle State
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future use
  const [success, setSuccess] = useState<string | null>(null);

  // initial load state for fetching locations/plans/availability
  const [initLoading, setInitLoading] = useState(true);

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
      try {
        const supabase = createClient();
        // 1. Fetch Locations
        const { data: locs } = await supabase
          .from("mailroom_locations")
          .select("id,name,region,city,barangay,zip")
          .order("name", { ascending: true });

        // 2. Fetch Plans with Capabilities
        const { data: plns } = await supabase
          .from("mailroom_plans")
          .select(
            "id,name,price,description,can_receive_mail,can_receive_parcels,can_digitize,storage_limit",
          )
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
          const normalized = plns.map(
            (p: {
              id: string;
              name: string;
              price: number;
              can_receive_mail?: boolean;
              can_receive_parcels?: boolean;
              storage_limit?: number;
              can_digitize?: boolean;
              description?: string;
            }) => ({
              ...p,
              price: Number(p.price),
            }),
          );
          setPlans(normalized);
        }

        // Set the counts directly from API response
        setLocationAvailability(counts);
      } catch (err) {
        console.error("RegisterForm initial load error:", err);
      } finally {
        if (mounted) setInitLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);
  // show loader while initial data is fetched
  if (initLoading) {
    return (
      <Paper withBorder p="lg" radius="md" style={{ minHeight: 280 }}>
        <Center style={{ padding: 48 }}>
          <Loader />
        </Center>
      </Paper>
    );
  }

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future use
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
    } catch {
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
          `Only ${availableCount} locker(s) available at this location.`,
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
          "Invalid mobile number. Must be 11 digits starting with 09 (e.g., 09123456789).",
        );
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

    const profile = session?.profile as
      | {
          first_name?: string;
          last_name?: string;
          email?: string;
          mobile?: string;
          referral_code?: string;
        }
      | undefined;
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
      // build a stable order id
      const orderId = `reg_${session?.user?.id ?? "anon"}_${Date.now()}`;

      // flatten and stringify minimal metadata (strings only)
      const registrationMetadata = {
        order_id: orderId,
        user_id: session?.user?.id ?? "",
        full_name: `${firstName} ${lastName}`.trim() || "",
        email,
        mobile,
        location_id: selectedLocation ?? "",
        plan_id: selectedPlanId ?? "",
        locker_qty: String(qty),
        months: String(months),
        notes: notes || "",
        referral_code: referralValid ? referralCode : "",
      };

      // Create checkout session (server will call PayMongo)
      const minor = Math.round(Number(totalCost) * 100);
      const payRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount: minor,
          currency: "PHP",
          show_all: true,
          metadata: registrationMetadata,
          // redirect back to the mailroom register pages (same route as API)
          successUrl: `${
            location.origin
          }/mailroom/register/success?order=${encodeURIComponent(orderId)}`,
          failedUrl: `${
            location.origin
          }/mailroom/register/failed?order=${encodeURIComponent(orderId)}`,
        }),
      });

      const payJson = await payRes.json().catch(() => null);
      const checkoutUrl =
        payJson?.data?.attributes?.checkout_url ||
        payJson?.data?.attributes?.redirect?.checkout_url ||
        payJson?.data?.attributes?.redirect?.url ||
        null;

      if (!checkoutUrl) {
        setError(
          payJson?.errors?.[0]?.detail ||
            payJson?.error ||
            "Failed to create payment session",
        );
        close();
        return;
      }

      // Redirect to hosted checkout. Webhook will finalize registration on paid.
      window.location.href = checkoutUrl;
      return;
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
                    // Calculate pricing for display
                    const monthlyBase = p.price;
                    const annualTotal = monthlyBase * 12 * 0.8;
                    const annualMonthlyEquivalent = monthlyBase * 0.8;

                    const displayPrice =
                      billingCycle === "annual"
                        ? annualMonthlyEquivalent
                        : monthlyBase;

                    const isSelected = selectedPlanId === p.id;
                    const isPopular = p.name === "Personal"; // Static "Popular" flag

                    // DYNAMIC FEATURES LIST based on DB columns
                    const features = [];

                    // 1. Storage
                    if (p.storage_limit && p.storage_limit > 0) {
                      // Convert MB to GB if >= 1024, otherwise show MB
                      const storageLabel =
                        p.storage_limit >= 1024
                          ? `${(p.storage_limit / 1024).toFixed(
                              0,
                            )}GB Digital Storage`
                          : `${p.storage_limit}MB Digital Storage`;

                      features.push({
                        label: storageLabel,
                        icon: IconBox,
                      });
                    }

                    // 2. Mail
                    if (p.can_receive_mail) {
                      features.push({
                        label: "Mail Reception",
                        icon: IconMail,
                      });
                    }

                    // 3. Parcels
                    if (p.can_receive_parcels) {
                      features.push({
                        label: "Parcel Reception",
                        icon: IconPackage,
                      });
                    }

                    // 4. Digitization
                    if (p.can_digitize) {
                      features.push({
                        label: "Scan & Digitize",
                        icon: IconScan,
                      });
                    }

                    return (
                      <Card
                        key={p.id}
                        padding="xl"
                        radius="md"
                        withBorder
                        onClick={() => setSelectedPlanId(p.id)}
                        style={{
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          borderColor: isSelected
                            ? "#26316D"
                            : "var(--mantine-color-gray-3)",
                          borderWidth: isSelected ? 2 : 1,
                          backgroundColor: isSelected
                            ? "var(--mantine-color-blue-0)"
                            : "white",
                          transform: isSelected ? "translateY(-4px)" : "none",
                          boxShadow: isSelected
                            ? "0 10px 20px rgba(38, 49, 109, 0.1)"
                            : "none",
                          position: "relative",
                          overflow: "visible",
                        }}
                      >
                        {isPopular && (
                          <Badge
                            color="orange"
                            variant="filled"
                            size="sm"
                            style={{
                              position: "absolute",
                              top: -10,
                              right: 20,
                              zIndex: 10,
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                          >
                            MOST POPULAR
                          </Badge>
                        )}

                        <Stack justify="space-between" h="100%">
                          <Box>
                            <Group
                              justify="space-between"
                              align="flex-start"
                              mb="md"
                            >
                              <Badge
                                size="lg"
                                variant={isSelected ? "filled" : "light"}
                                color={isSelected ? "blue" : "gray"}
                                style={{
                                  backgroundColor: isSelected
                                    ? "#26316D"
                                    : undefined,
                                }}
                              >
                                {p.name}
                              </Badge>
                              {isSelected && (
                                <ThemeIcon
                                  color="#26316D"
                                  radius="xl"
                                  size="md"
                                  variant="filled"
                                >
                                  <IconCheck size={14} />
                                </ThemeIcon>
                              )}
                            </Group>

                            <Group align="baseline" gap={4}>
                              <Text
                                size="xl"
                                fw={800}
                                c="#26316D"
                                style={{ fontSize: "2rem", lineHeight: 1 }}
                              >
                                {format(displayPrice)}
                              </Text>
                              <Text c="dimmed" fw={500}>
                                /mo
                              </Text>
                            </Group>

                            {billingCycle === "annual" ? (
                              <Group gap={6} mt={4} mb="md">
                                <Text size="xs" c="dimmed" td="line-through">
                                  {format(monthlyBase)}
                                </Text>
                                <Text size="xs" c="green" fw={600}>
                                  Billed {format(annualTotal)} yearly
                                </Text>
                              </Group>
                            ) : (
                              <Box h={22} mt={4} mb="md" />
                            )}

                            <Divider my="sm" variant="dashed" />

                            <Text
                              size="sm"
                              c="dimmed"
                              mb="md"
                              style={{ lineHeight: 1.4 }}
                            >
                              {p.description}
                            </Text>

                            <Stack gap="sm">
                              {features.map((f, idx) => (
                                <Group key={idx} gap="sm">
                                  <ThemeIcon
                                    color={isSelected ? "blue" : "gray"}
                                    variant="light"
                                    size="sm"
                                    radius="xl"
                                  >
                                    <IconCheck size={10} />
                                  </ThemeIcon>
                                  <Text size="sm" fw={500} c="dark.3">
                                    {f.label}
                                  </Text>
                                </Group>
                              ))}
                            </Stack>
                          </Box>

                          <Button
                            fullWidth
                            variant={isSelected ? "filled" : "light"}
                            color="blue"
                            mt="xl"
                            style={{
                              backgroundColor: isSelected
                                ? "#26316D"
                                : undefined,
                              color: isSelected ? "white" : undefined,
                            }}
                          >
                            {isSelected ? "Selected" : "Select Plan"}
                          </Button>
                        </Stack>
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
                            backgroundColor: (() => {
                              if (selectedLocation === loc.id)
                                return "var(--mantine-color-blue-0)";
                              if (isFull) return "var(--mantine-color-gray-0)";
                              return "transparent";
                            })(),
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
                              color={(() => {
                                if (isFull) return "red";
                                if (count < 5) return "orange";
                                return "green";
                              })()}
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
                                Math.min(availableCount, Number(lockerQty) + 1),
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
                        onChange={(e) => {
                          // allow letters, spaces, hyphens and apostrophes only
                          const val = e.currentTarget.value.replace(
                            /[^A-Za-z\s'-]/g,
                            "",
                          );
                          setFirstName(val);
                        }}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Last Name"
                        value={lastName}
                        onChange={(e) => {
                          const val = e.currentTarget.value.replace(
                            /[^A-Za-z\s'-]/g,
                            "",
                          );
                          setLastName(val);
                        }}
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
                  By clicking &quot;Proceed to Payment&quot;, you will be
                  redirected to our secure payment gateway to complete your
                  transaction.
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
          <Paper withBorder p="xl" radius="md" shadow="sm">
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
