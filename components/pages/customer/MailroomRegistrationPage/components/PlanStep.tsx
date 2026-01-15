"use client";

import React from "react";
import {
  Stack,
  Group,
  Title,
  SegmentedControl,
  Alert,
  SimpleGrid,
  Card,
  Badge,
  Box,
  ThemeIcon,
  Text,
  Divider,
  Button,
} from "@mantine/core";
import {
  IconBox,
  IconMail,
  IconPackage,
  IconScan,
  IconCheck,
} from "@tabler/icons-react";
import { Plan } from "@/utils/types";

type PlanStepProps = {
  plans: Plan[];
  selectedPlanId: string | null;
  setSelectedPlanId: (id: string) => void;
  billingCycle: "monthly" | "annual";
  setBillingCycle: (cycle: "monthly" | "annual") => void;
  format: (n: number) => string;
};

export const PlanStep = ({
  plans,
  selectedPlanId,
  setSelectedPlanId,
  billingCycle,
  setBillingCycle,
  format,
}: PlanStepProps) => {
  return (
    <Stack mt="lg">
      <Group justify="space-between" align="center">
        <Title order={2}>1. Select Your Plan</Title>
        <SegmentedControl
          value={billingCycle}
          onChange={(val) => setBillingCycle(val as "monthly" | "annual")}
          data={[
            { label: "Monthly", value: "monthly" },
            { label: "Annual", value: "annual" },
          ]}
          color="#26316D"
          radius="md"
        />
      </Group>

      {plans.length === 0 ? (
        <Alert color="yellow" title="No Plans Available">
          <Text size="sm">
            No mailroom plans are currently available. Please contact support or
            check back later.
          </Text>
        </Alert>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {plans.map((p) => {
            const monthlyBase = p.price;
            const annualTotal = monthlyBase * 12 * 0.8;
            const annualMonthlyEquivalent = monthlyBase * 0.8;
            const displayPrice =
              billingCycle === "annual" ? annualMonthlyEquivalent : monthlyBase;
            const isSelected = selectedPlanId === p.id;
            const isPopular = p.name === "Personal";

            const features = [];
            if (p.storage_limit && p.storage_limit > 0) {
              const storageLabel =
                p.storage_limit >= 1024
                  ? `${(p.storage_limit / 1024).toFixed(0)}GB Digital Storage`
                  : `${p.storage_limit}MB Digital Storage`;
              features.push({ label: storageLabel, icon: IconBox });
            }
            if (p.can_receive_mail)
              features.push({ label: "Mail Reception", icon: IconMail });
            if (p.can_receive_parcels)
              features.push({ label: "Parcel Reception", icon: IconPackage });
            if (p.can_digitize)
              features.push({ label: "Scan & Digitize", icon: IconScan });

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
                    }}
                  >
                    MOST POPULAR
                  </Badge>
                )}

                <Stack justify="space-between" h="100%">
                  <Box>
                    <Group justify="space-between" align="flex-start" mb="md">
                      <Badge
                        size="lg"
                        variant={isSelected ? "filled" : "light"}
                        color={isSelected ? "blue" : "#313131"}
                        style={{
                          backgroundColor: isSelected ? "#26316D" : undefined,
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
                      <Text c="#313131" fw={500}>
                        /mo
                      </Text>
                    </Group>

                    {billingCycle === "annual" ? (
                      <Group gap={6} mt={4} mb="md">
                        <Text size="xs" c="#313131" td="line-through">
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
                      c="#313131"
                      mb="md"
                      style={{ lineHeight: 1.4 }}
                    >
                      {p.description}
                    </Text>

                    <Stack gap="sm">
                      {features.map((f, idx) => (
                        <Group key={idx} gap="sm">
                          <ThemeIcon
                            color={isSelected ? "blue" : "#313131"}
                            variant="light"
                            size="sm"
                            radius="xl"
                          >
                            <IconCheck size={10} />
                          </ThemeIcon>
                          <Text size="sm" fw={500} c="#313131">
                            {f.label}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  </Box>
                  <Button
                    fullWidth
                    variant={isSelected ? "filled" : "default"}
                    mt="xl"
                    style={{
                      color: isSelected ? "#fff" : "#313131",
                      backgroundColor: isSelected ? "#26316D" : undefined,
                    }}
                  >
                    {isSelected ? "Selected" : "Select Plan"}
                  </Button>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );
};
