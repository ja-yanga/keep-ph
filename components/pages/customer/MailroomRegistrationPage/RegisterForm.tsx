"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Grid,
  Group,
  Stack,
  Button,
  Badge,
  Title,
  Text,
  Modal,
  Divider,
  Alert,
  Stepper,
  ThemeIcon,
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
} from "@tabler/icons-react";
import { Location, Plan } from "@/utils/types";

// Modular Components
import { PlanStep } from "./components/PlanStep";
import { LocationStep } from "./components/LocationStep";
import { DetailsStep } from "./components/DetailsStep";
import { ReviewStep } from "./components/ReviewStep";
import { OrderSummary } from "./components/OrderSummary";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

type RegisterFormProps = {
  initialPlans?: Plan[];
  initialLocations?: Location[];
  initialLocationAvailability?: Record<string, number>;
};

export default function RegisterForm({
  initialPlans = [],
  initialLocations = [],
  initialLocationAvailability = {},
}: RegisterFormProps) {
  const router = useRouter();
  const { session } = useSession();
  const [payButtonIsDisabled, setPayButtonIsDisabled] = useState(false);

  // Modal state
  const [opened, { open, close }] = useDisclosure(false);

  // Form Data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  const [locations] = useState<Location[]>(initialLocations);
  const [plans] = useState<Plan[]>(initialPlans);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [lockerQty, setLockerQty] = useState<number | string>(1);

  // Location availability from server-side
  const [locationAvailability] = useState<Record<string, number>>(
    initialLocationAvailability,
  );

  // Billing Cycle State
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [months, setMonths] = useState<number>(1);

  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState("");

  // Referral State
  const [referralValid, setReferralValid] = useState(false);
  const [referralMessage, setReferralMessage] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Update months when billing cycle changes
  useEffect(() => {
    setMonths(billingCycle === "annual" ? 12 : 1);
  }, [billingCycle]);

  // Derived State
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const selectedLocationObj =
    locations.find((l) => l.id === selectedLocation) ?? null;
  const availableCount = selectedLocation
    ? locationAvailability[selectedLocation] || 0
    : 0;

  const basePrice = selectedPlan ? Number(selectedPlan.price) : 0;
  const qty = typeof lockerQty === "number" ? lockerQty : 1;

  // Calculate totals
  const displayedPlanPrice =
    billingCycle === "annual" ? basePrice * 12 * 0.8 : basePrice;
  const subTotal = displayedPlanPrice * qty;
  const referralDiscountAmount = referralValid ? subTotal * 0.05 : 0;
  const totalCost = subTotal - referralDiscountAmount;

  const format = (n: number) =>
    n.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    });

  const validateReferral = async () => {
    if (!referralCode.trim()) return;

    setValidatingCode(true);
    setReferralMessage("");
    setReferralValid(false);

    try {
      const res = await fetch(API_ENDPOINTS.referrals.validate, {
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

  const validateStep = (step: number) => {
    if (step === 0 && !selectedPlanId) {
      setError("Please select a plan to continue.");
      return false;
    }
    if (step === 1) {
      if (!selectedLocation) {
        setError("Please select a location to continue.");
        return false;
      }
      const qtyNum = Number(lockerQty);
      if (qtyNum < 1 || qtyNum > availableCount) {
        setError(
          `Please enter a valid locker quantity (Max: ${availableCount}).`,
        );
        return false;
      }
    }
    if (step === 2) {
      if (!firstName || !lastName || !email || !mobile) {
        setError("Please fill in all required fields.");
        return false;
      }
      if (!/^09\d{9}$/.test(mobile)) {
        setError("Invalid mobile number. Must be 11 digits starting with 09.");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    setError(null);
    if (validateStep(active)) {
      setActive((current) => (current < 3 ? current + 1 : current));
    }
  };

  const prevStep = () =>
    setActive((current) => (current > 0 ? current - 1 : current));

  const handleStepClick = (step: number) => {
    setError(null);
    if (step > active) {
      for (let i = active; i < step; i++) {
        if (!validateStep(i)) return;
      }
      setActive(step);
    } else {
      setActive(step);
    }
  };

  const handleConfirm = async () => {
    if (!session?.user?.id) {
      router.push("/signin");
      return;
    }
    const profile = session?.profile as { referral_code?: string };
    if (referralCode.trim() && profile?.referral_code === referralCode.trim()) {
      setError("You cannot use your own referral code.");
      return;
    }
    open();
  };

  const submitRegistration = async () => {
    setPayButtonIsDisabled(true);
    setLoading(true);
    setError(null);
    try {
      const orderId = `reg_${session?.user?.id ?? "anon"}_${Date.now()}`;
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

      const minor = Math.round((Number(totalCost) / qty) * 100);
      const payRes = await fetch(API_ENDPOINTS.payments.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          planName: selectedPlan?.name ?? "Mailroom Plan",
          amount: minor,
          quantity: qty,
          currency: "PHP",
          show_all: true,
          metadata: registrationMetadata,
          successUrl: `${location.origin}/mailroom/register/success?order=${encodeURIComponent(orderId)}`,
          failedUrl: `${location.origin}/mailroom/register/failed?order=${encodeURIComponent(orderId)}`,
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

      window.location.href = checkoutUrl;
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
      close();
      setPayButtonIsDisabled(false);
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
                  {billingCycle === "annual" ? "Annual" : "Monthly"}
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
              disabled={payButtonIsDisabled}
              style={{ backgroundColor: "#26316D" }}
            >
              Confirm & Pay
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Grid gutter="xl">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stepper
            active={active}
            onStepClick={handleStepClick}
            color="#26316D"
            iconSize={32}
          >
            <Stepper.Step
              label="Plan"
              description="Select package"
              icon={<IconBox size={18} />}
            >
              <PlanStep
                plans={plans}
                selectedPlanId={selectedPlanId}
                setSelectedPlanId={setSelectedPlanId}
                billingCycle={billingCycle}
                setBillingCycle={setBillingCycle}
                format={format}
              />
            </Stepper.Step>

            <Stepper.Step
              label="Location"
              description="Choose branch"
              icon={<IconMapPin size={18} />}
            >
              <LocationStep
                locations={locations}
                selectedLocation={selectedLocation}
                setSelectedLocation={setSelectedLocation}
                locationAvailability={locationAvailability}
                lockerQty={lockerQty}
                setLockerQty={setLockerQty}
                availableCount={availableCount}
              />
            </Stepper.Step>

            <Stepper.Step
              label="Details"
              description="Personal info"
              icon={<IconUser size={18} />}
            >
              <DetailsStep
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                email={email}
                setEmail={setEmail}
                mobile={mobile}
                setMobile={setMobile}
              />
            </Stepper.Step>

            <Stepper.Step
              label="Review"
              description="Finalize"
              icon={<IconCreditCard size={18} />}
            >
              <ReviewStep
                firstName={firstName}
                lastName={lastName}
                email={email}
                mobile={mobile}
                referralCode={referralCode}
                setReferralCode={setReferralCode}
                referralValid={referralValid}
                setReferralValid={setReferralValid}
                referralMessage={referralMessage}
                setReferralMessage={setReferralMessage}
                validatingCode={validatingCode}
                validateReferral={validateReferral}
                notes={notes}
                setNotes={setNotes}
                setActive={setActive}
              />
            </Stepper.Step>

            <Stepper.Completed>
              <Stack align="center" mt="xl">
                <ThemeIcon size={60} radius="xl" color="teal" variant="light">
                  <IconCheck size={34} />
                </ThemeIcon>
                <Title order={3}>Registration Complete!</Title>
              </Stack>
            </Stepper.Completed>
          </Stepper>

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
              <Button
                onClick={active === 3 ? handleConfirm : nextStep}
                color="blue"
                disabled={payButtonIsDisabled}
                style={{ backgroundColor: "#26316D" }}
                size={active === 3 ? "md" : "sm"}
                rightSection={
                  active < 3 ? <IconChevronRight size={16} /> : null
                }
              >
                {active === 3 ? "Proceed to Payment" : "Next Step"}
              </Button>
            </Group>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <OrderSummary
            selectedPlan={selectedPlan}
            selectedLocationObj={selectedLocationObj}
            billingCycle={billingCycle}
            qty={qty}
            referralValid={referralValid}
            subTotal={subTotal}
            referralDiscountAmount={referralDiscountAmount}
            totalCost={totalCost}
            format={format}
          />
        </Grid.Col>
      </Grid>
    </Box>
  );
}
