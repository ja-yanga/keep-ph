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
import { IconCheck, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { LANDING_PAGE } from "@/utils/constants";
import type { MailroomPlan } from "@/utils/types";

const PRICING_COPY = LANDING_PAGE.pricing;
const BILLING_OPTIONS = PRICING_COPY.segmentedControl.options;
const BILLING_DEFAULT = PRICING_COPY.segmentedControl.defaultValue;
const DISCOUNT_RATE = PRICING_COPY.segmentedControl.annualDiscountRate;

type BillingCadence = (typeof BILLING_OPTIONS)[number]["value"];

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

        if (!response.ok) {
          throw new Error("Failed to fetch plans");
        }

        const data = (await response.json()) as MailroomPlan[];
        setPlans(data);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        setError(PRICING_COPY.fallback.error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();

    return () => controller.abort();
  }, []);

  const formatPrice = (price: number) =>
    `₱${price.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })}`;

  const getDisplayPrice = (price: number) =>
    billing === "monthly" ? price : Math.round(price * (1 - DISCOUNT_RATE));

  const getAnnualTotal = (price: number) =>
    Math.round(price * 12 * (1 - DISCOUNT_RATE)).toLocaleString();

  const getFeatureIconColor = (available: boolean, featured: boolean) => {
    if (!available) {
      return "red";
    }

    return featured ? "blue" : "teal";
  };

  const renderPlanCard = (plan: MailroomPlan) => {
    const isFeatured = plan.name === PRICING_COPY.featuredPlanName;
    const featuredStyles = isFeatured
      ? {
          border: "2px solid #1A237E",
          transform: "scale(1.02)",
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
        padding="xl"
        style={featuredStyles}
      >
        <Stack justify="space-between" h="100%">
          <Box>
            <Group justify="space-between" mb="xs">
              <Title order={4} c={isFeatured ? "#1A237E" : undefined}>
                {plan.name}
              </Title>
              {isFeatured && (
                <Badge color="blue" variant="filled">
                  {PRICING_COPY.featuredPlanName}
                </Badge>
              )}
            </Group>
            <Group align="baseline" gap={4}>
              <Text
                size={rem(32)}
                fw={800}
                c={isFeatured ? "#1A237E" : undefined}
              >
                {formatPrice(getDisplayPrice(plan.price))}
              </Text>
              <Text c="dimmed">{PRICING_COPY.priceSuffix}</Text>
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
          >
            {PRICING_COPY.button.label}
          </Button>
        </Stack>
      </Card>
    );
  };

  let pricingContent: ReactNode;

  if (loading) {
    pricingContent = (
      <Text ta="center" c="dimmed">
        {PRICING_COPY.fallback.loading}
      </Text>
    );
  } else if (error) {
    pricingContent = (
      <Text ta="center" c="red">
        {error}
      </Text>
    );
  } else if (!plans.length) {
    pricingContent = (
      <Stack align="center" gap="xs">
        <Title order={4}>{PRICING_COPY.fallback.emptyTitle}</Title>
        <Text c="dimmed" ta="center">
          {PRICING_COPY.fallback.emptyDescription}
        </Text>
      </Stack>
    );
  } else {
    pricingContent = (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {plans.map(renderPlanCard)}
      </SimpleGrid>
    );
  }

  return (
    <Box bg={PRICING_COPY.background} py={80} id={PRICING_COPY.sectionId}>
      <Container size="xl">
        <Stack align="center" gap="sm" mb={50}>
          <Title order={2} size={36} c="#1A237E">
            {PRICING_COPY.heading}
          </Title>
          <Text c="dimmed" ta="center" size="lg" maw={600}>
            {PRICING_COPY.subheading}
          </Text>

          <Group mt="md">
            <SegmentedControl
              value={billing}
              onChange={(value) => setBilling(value as BillingCadence)}
              data={BILLING_OPTIONS}
              size="md"
              radius="xl"
              color="blue"
              bg="white"
            />
          </Group>
        </Stack>
        {pricingContent}
      </Container>
    </Box>
  );
}
