"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  rem,
  Badge,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconCheck, IconX } from "@tabler/icons-react";
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

  // Hook to detect mobile for specific logic (like the transform scale)
  const isMobile = useMediaQuery("(max-width: 48em)");

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

  const formatPrice = (price: number) =>
    `₱${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const getDisplayPrice = (price: number) =>
    billing === "monthly" ? price : Math.round(price * (1 - DISCOUNT_RATE));

  const getAnnualTotal = (price: number) =>
    Math.round(price * 12 * (1 - DISCOUNT_RATE)).toLocaleString();

  const getFeatureIconColor = (available: boolean, featured: boolean) => {
    if (!available) return "red";
    return featured ? "blue" : "teal";
  };

  const renderPlanCard = (plan: MailroomPlan) => {
    const isFeatured = plan.name === PRICING_COPY.featuredPlanName;

    // Only apply scale and extra shadow on Desktop
    const featuredStyles = isFeatured
      ? {
          border: "2px solid #1A237E",
          transform: isMobile ? "none" : "scale(1.02)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          zIndex: 1,
        }
      : {};

    const description = plan.description ?? PRICING_COPY.descriptionFallback;
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
      { label: PRICING_COPY.features.canDigitize, available: plan.canDigitize },
    ];

    return (
      <Card
        key={plan.id}
        radius="lg"
        withBorder={!isFeatured}
        padding={isMobile ? "lg" : "xl"}
        style={featuredStyles}
      >
        <Stack justify="space-between" h="100%">
          <Box>
            <Group justify="space-between" mb="xs" wrap="nowrap">
              <Title order={4} c={isFeatured ? "#1A237E" : undefined} size="h4">
                {plan.name}
              </Title>
              {isFeatured && (
                <Badge color="blue" variant="filled" size="sm">
                  {PRICING_COPY.featuredPlanName}
                </Badge>
              )}
            </Group>

            <Group align="baseline" gap={4}>
              <Text
                size={isMobile ? rem(28) : rem(32)}
                fw={800}
                c={isFeatured ? "#1A237E" : undefined}
              >
                {formatPrice(getDisplayPrice(plan.price))}
              </Text>
              <Text c="dimmed" size="sm">
                {PRICING_COPY.priceSuffix}
              </Text>
            </Group>

            {billing === "annual" && (
              <Text size="xs" c="green" fw={500}>
                {PRICING_COPY.annualBilling.prefix} ₱
                {getAnnualTotal(plan.price)} {PRICING_COPY.annualBilling.suffix}
              </Text>
            )}

            <Text size="sm" c="dimmed" mt="xs">
              {description}
            </Text>

            <List spacing="sm" mt="xl" size="sm" center>
              {featureItems.map((item) => (
                <List.Item
                  key={item.label}
                  icon={
                    <ThemeIcon
                      color={getFeatureIconColor(item.available, isFeatured)}
                      size={20}
                      radius="xl"
                    >
                      {item.available ? (
                        <IconCheck size={12} />
                      ) : (
                        <IconX size={12} />
                      )}
                    </ThemeIcon>
                  }
                >
                  {item.label}
                </List.Item>
              ))}
            </List>
          </Box>
          <Button
            component={Link}
            href={PRICING_COPY.button.href}
            variant={isFeatured ? "filled" : "outline"}
            color={isFeatured ? "#1A237E" : undefined}
            fullWidth
            radius="md"
            mt="xl"
            size={isMobile ? "md" : "sm"}
          >
            {PRICING_COPY.button.label}
          </Button>
        </Stack>
      </Card>
    );
  };

  const renderFreePlanCard = (plan: MailroomPlan) => {
    return (
      <Card
        key={plan.id}
        radius="lg"
        withBorder
        padding={isMobile ? "lg" : "xl"}
      >
        <Stack justify="space-between" h="100%">
          <Box>
            <Group justify="space-between" mb="xs" wrap="nowrap">
              <Title order={4} size="h4">
                {plan.name}
              </Title>
              <Badge color="gray" variant="light" size="sm">
                Free
              </Badge>
            </Group>

            <Group align="baseline" gap={4}>
              <Text size={isMobile ? rem(28) : rem(32)} fw={800}>
                ₱0
              </Text>
              <Text c="dimmed" size="sm">
                /month
              </Text>
            </Group>

            <Text size="sm" c="dimmed" mt="xs">
              {plan.description}
            </Text>

            <List spacing="sm" mt="xl" size="sm">
              {[
                "Affiliate link access",
                "Earn cash reward after 10 referrals",
                "Track your referrals",
              ].map((f) => (
                <List.Item
                  key={f}
                  icon={
                    <ThemeIcon color="teal" size={20} radius="xl">
                      <IconCheck size={12} />
                    </ThemeIcon>
                  }
                >
                  {f}
                </List.Item>
              ))}
              <List.Item
                icon={
                  <ThemeIcon color="red" size={20} radius="xl">
                    <IconX size={12} />
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
            fullWidth
            radius="md"
            mt="xl"
            size={isMobile ? "md" : "sm"}
          >
            {PRICING_COPY.button.label}
          </Button>
        </Stack>
      </Card>
    );
  };

  // prepare main content to avoid nested ternary expressions (ESLint)
  let mainContent: ReactNode;
  if (loading) {
    mainContent = (
      <Text ta="center" c="dimmed">
        {PRICING_COPY.fallback.loading}
      </Text>
    );
  } else if (error) {
    mainContent = (
      <Text ta="center" c="red">
        {error}
      </Text>
    );
  } else if (!plans.length) {
    mainContent = (
      <Stack align="center" gap="xs">
        <Title order={4}>{PRICING_COPY.fallback.emptyTitle}</Title>
        <Text c="dimmed" ta="center">
          {PRICING_COPY.fallback.emptyDescription}
        </Text>
      </Stack>
    );
  } else {
    mainContent = (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {[FREE_PLAN, ...plans].map((p) =>
          p.id === FREE_PLAN.id ? renderFreePlanCard(p) : renderPlanCard(p),
        )}
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
          <Title order={2} size={isMobile ? 28 : 36} c="#1A237E" ta="center">
            {PRICING_COPY.heading}
          </Title>
          <Text c="dimmed" ta="center" size={isMobile ? "md" : "lg"} maw={600}>
            {PRICING_COPY.subheading}
          </Text>

          <Box mt="md" w={{ base: "100%", sm: "auto" }}>
            <SegmentedControl
              value={billing}
              onChange={(value) => setBilling(value as BillingCadence)}
              data={BILLING_OPTIONS}
              size={isMobile ? "sm" : "md"}
              radius="xl"
              color="blue"
              bg="white"
              fullWidth={isMobile}
            />
          </Box>
        </Stack>

        {mainContent}
      </Container>
    </Box>
  );
}
