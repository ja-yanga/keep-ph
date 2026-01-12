"use client";

import {
  useEffect,
  useState,
  type ReactNode,
  useMemo,
  useCallback,
} from "react";
import {
  Container,
  Stack,
  Title,
  Text,
  Group,
  SegmentedControl,
  SimpleGrid,
  Card,
  ThemeIcon,
  List,
  Button,
  Box,
  Badge,
} from "@mantine/core";
// small inline icons to avoid bundling tabler icons
const CheckIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M20 6L9 17l-5-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const XIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M18 6L6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
import Link from "next/link";
import { LANDING_PAGE } from "@/utils/constants";
import type { MailroomPlan } from "@/utils/types";

const PRICING_COPY = LANDING_PAGE.pricing;
const BILLING_OPTIONS = PRICING_COPY.segmentedControl.options;
const BILLING_DEFAULT = PRICING_COPY.segmentedControl.defaultValue;
const DISCOUNT_RATE = PRICING_COPY.segmentedControl.annualDiscountRate;

type BillingCadence = (typeof BILLING_OPTIONS)[number]["value"];

const FREE_PLAN: MailroomPlan = {
  id: "free-plan",
  name: "Free",
  price: 0,
  description: "Earn cash reward after 10 referrals",
  storageLimit: null,
  canReceiveMail: false,
  canReceiveParcels: false,
  canDigitize: false,
};

export default function PricingSection() {
  const [billing, setBilling] = useState<BillingCadence>(
    BILLING_DEFAULT as BillingCadence,
  );
  const [plans, setPlans] = useState<MailroomPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/plans", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to fetch plans");
        const data = (await response.json()) as MailroomPlan[];
        setPlans(data);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
        setError(PRICING_COPY.fallback.error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
    return () => controller.abort();
  }, []);

  const getIconConfig = useCallback(
    (available: boolean, isFeatured: boolean) => {
      if (!available) return { color: "red", icon: <XIcon size={12} /> };
      if (isFeatured) return { color: "blue", icon: <CheckIcon size={12} /> };
      return { color: "teal", icon: <CheckIcon size={12} /> };
    },
    [],
  );

  const renderFreePlanCard = (plan: MailroomPlan) => (
    <Card key={plan.id} radius="lg" withBorder className="pricing-card">
      <Stack justify="space-between" h="100%">
        <Box>
          <Group justify="space-between" mb="xs" wrap="nowrap">
            <Title order={3} size="h4">
              {plan.name}
            </Title>
          </Group>
          <Group align="baseline" gap={4}>
            <Text className="price-text" fw={800} c="#212529">
              ₱0
            </Text>
            <Text c="#495057" size="sm">
              /month
            </Text>
          </Group>
          <Text size="sm" c="#495057" mt="xs">
            {plan.description}
          </Text>
          <List spacing="sm" mt="xl" size="sm" c="#343a40">
            {[
              "Affiliate link access",
              "Earn cash reward after 10 referrals",
              "Track your referrals",
            ].map((f) => (
              <List.Item
                key={f}
                icon={
                  <ThemeIcon color="teal" size={20} radius="xl">
                    <CheckIcon size={12} />
                  </ThemeIcon>
                }
              >
                {f}
              </List.Item>
            ))}
            <List.Item
              icon={
                <ThemeIcon color="red" size={20} radius="xl">
                  <XIcon size={12} />
                </ThemeIcon>
              }
            >
              No mail services
            </List.Item>
          </List>
        </Box>
        <Button
          component={Link}
          href={PRICING_COPY.button.href}
          variant="outline"
          color="#1A237E"
          fullWidth
          radius="md"
          mt="xl"
          className="plan-button"
        >
          {PRICING_COPY.button.label}
        </Button>
      </Stack>
    </Card>
  );

  const renderedPlans = useMemo(() => {
    return plans.map((plan) => {
      const isFeatured = plan.name === PRICING_COPY.featuredPlanName;

      const displayPrice =
        billing === "monthly"
          ? plan.price
          : Math.round(plan.price * (1 - DISCOUNT_RATE));

      const annualTotal = Math.round(
        plan.price * 12 * (1 - DISCOUNT_RATE),
      ).toLocaleString();

      const storageLabel = plan.storageLimit
        ? `${plan.storageLimit} ${PRICING_COPY.features.storageUnitSuffix}`
        : PRICING_COPY.features.unlimitedStorageLabel;

      const featureItems = [
        {
          label: `${PRICING_COPY.features.storageLimit}: ${storageLabel}`,
          available: true,
        },
        {
          label: PRICING_COPY.features.canReceiveMail,
          available: plan.canReceiveMail,
        },
        {
          label: PRICING_COPY.features.canReceiveParcels,
          available: plan.canReceiveParcels,
        },
        {
          label: PRICING_COPY.features.canDigitize,
          available: plan.canDigitize,
        },
      ];

      return (
        <Card
          key={plan.id}
          radius="lg"
          withBorder={!isFeatured}
          className={`pricing-card ${isFeatured ? "featured-card" : ""}`}
        >
          <Stack justify="space-between" h="100%">
            <Box>
              <Group justify="space-between" mb="xs" wrap="nowrap">
                <Title
                  order={3}
                  c={isFeatured ? "#1A237E" : undefined}
                  size="h4"
                >
                  {plan.name}
                </Title>
                {isFeatured && (
                  <Badge variant="filled" bg="#1A237E" c="white" size="sm">
                    {PRICING_COPY.featuredPlanName}
                  </Badge>
                )}
              </Group>

              <Group align="baseline" gap={4}>
                <Text
                  className="price-text"
                  fw={800}
                  c={isFeatured ? "#1A237E" : "#212529"}
                >
                  ₱{displayPrice.toLocaleString()}
                </Text>
                <Text c="#495057" size="sm">
                  {PRICING_COPY.priceSuffix}
                </Text>
              </Group>

              {billing === "annual" && (
                <Text size="xs" c="#087f5b" fw={600}>
                  {PRICING_COPY.annualBilling.prefix} ₱ {annualTotal}{" "}
                  {PRICING_COPY.annualBilling.suffix}
                </Text>
              )}

              <Text size="sm" c="#495057" mt="xs">
                {plan.description ?? PRICING_COPY.descriptionFallback}
              </Text>

              <List spacing="sm" mt="xl" size="sm" center c="#343a40">
                {featureItems.map((item) => {
                  const config = getIconConfig(item.available, isFeatured);
                  return (
                    <List.Item
                      key={item.label}
                      icon={
                        <ThemeIcon color={config.color} size={20} radius="xl">
                          {config.icon}
                        </ThemeIcon>
                      }
                    >
                      {item.label}
                    </List.Item>
                  );
                })}
              </List>
            </Box>
            <Button
              component={Link}
              href={PRICING_COPY.button.href}
              variant={isFeatured ? "filled" : "outline"}
              color="#1A237E"
              fullWidth
              radius="md"
              mt="xl"
              className="plan-button"
            >
              {PRICING_COPY.button.label}
            </Button>
          </Stack>
        </Card>
      );
    });
  }, [plans, billing, getIconConfig]);

  let mainContent: ReactNode;
  if (loading) {
    mainContent = (
      <Text ta="center" c="dimmed" py="xl">
        {PRICING_COPY.fallback.loading}
      </Text>
    );
  } else if (error) {
    mainContent = (
      <Text ta="center" c="red" py="xl">
        {error}
      </Text>
    );
  } else if (plans.length === 0) {
    mainContent = (
      <Stack align="center" gap="xs" py="xl">
        <Title order={4}>{PRICING_COPY.fallback.emptyTitle}</Title>
        <Text c="dimmed" ta="center">
          {PRICING_COPY.fallback.emptyDescription}
        </Text>
      </Stack>
    );
  } else {
    mainContent = (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {renderFreePlanCard(FREE_PLAN)}
        {renderedPlans}
      </SimpleGrid>
    );
  }

  return (
    <Box
      bg={PRICING_COPY.background}
      py={{ base: 40, md: 80 }}
      id={PRICING_COPY.sectionId}
    >
      <Container size="xl">
        <Stack align="center" gap="sm" mb={{ base: 30, md: 50 }}>
          <Title order={2} fz={{ base: 28, md: 36 }} c="#1A237E" ta="center">
            {PRICING_COPY.heading}
          </Title>
          <Text c="#343a40" ta="center" size="lg" maw={600}>
            {PRICING_COPY.subheading}
          </Text>
          <Box mt="md" w={{ base: "100%", sm: "auto" }}>
            <SegmentedControl
              value={billing}
              onChange={(value) => setBilling(value as BillingCadence)}
              data={BILLING_OPTIONS}
              radius="xl"
              className="billing-control"
              styles={{
                root: { backgroundColor: "#f1f3f5" },
                label: { color: "#495057", fontWeight: 600 },
                indicator: { backgroundColor: "#1A237E" },
              }}
              classNames={{ label: "pricing-segment-label" }}
            />
          </Box>
        </Stack>
        {mainContent}
      </Container>

      <style jsx global>{`
        .pricing-segment-label[data-active="true"] {
          color: #ffffff !important;
        }
        .pricing-card {
          padding: 24px;
        }
        .price-text {
          font-size: 32px;
        }
        .featured-card {
          border: 2px solid #1a237e !important;
          transform: scale(1.02);
          z-index: 1;
        }
        .plan-button {
          height: 36px;
          font-size: 14px;
        }
        @media (max-width: 48em) {
          .pricing-card {
            padding: 16px;
          }
          .price-text {
            font-size: 28px;
          }
          .featured-card {
            transform: none;
          }
          .plan-button {
            height: 42px;
            font-size: 16px;
          }
          .billing-control {
            width: 100% !important;
          }
        }
      `}</style>
    </Box>
  );
}
