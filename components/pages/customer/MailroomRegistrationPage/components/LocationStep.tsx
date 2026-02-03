"use client";

import React, { useEffect } from "react";
import {
  Stack,
  Title,
  Paper,
  ScrollArea,
  Box,
  Group,
  Radio,
  Text,
  Badge,
  Divider,
  ActionIcon,
  NumberInput,
} from "@mantine/core";
import { Location } from "@/utils/types";

type LocationStepProps = {
  locations: Location[];
  selectedLocation: string | null;
  setSelectedLocationAction: (id: string) => void;
  locationAvailability: Record<string, number>;
  lockerQty: number | string;
  setLockerQtyAction: (val: number | string) => void;
  availableCount: number;
};

// explicit extended type (no `any`)
type LocWithMeta = Location & {
  is_hidden?: boolean;
  max_locker_limit?: number | string | null;
  max_lockers?: number | string | null;
};

export const LocationStep = ({
  locations,
  selectedLocation,
  setSelectedLocationAction,
  locationAvailability,
  lockerQty,
  setLockerQtyAction,
  availableCount,
}: LocationStepProps) => {
  // determine selected location's API max limit (if any)
  const selectedLoc = selectedLocation
    ? (locations.find((l) => l.id === selectedLocation) ?? null)
    : null;

  const rawSelectedMax =
    (selectedLoc as LocWithMeta)?.max_locker_limit ??
    (selectedLoc as LocWithMeta)?.max_lockers ??
    null;

  const selectedMaxLimit =
    rawSelectedMax != null && rawSelectedMax !== ""
      ? Number(rawSelectedMax)
      : null;

  const effectiveMaxForSelected =
    selectedMaxLimit != null && Number.isFinite(selectedMaxLimit)
      ? Math.min(availableCount, selectedMaxLimit)
      : availableCount;

  // clamp lockerQty if it exceeds effective max
  useEffect(() => {
    const current = Number(lockerQty) || 0;
    if (effectiveMaxForSelected != null && current > effectiveMaxForSelected) {
      setLockerQtyAction(effectiveMaxForSelected);
    }
  }, [effectiveMaxForSelected, lockerQty, setLockerQtyAction]);

  return (
    <Stack mt="lg">
      <Title order={4}>Select Mailroom Location</Title>
      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <ScrollArea h={300}>
          {locations
            // exclude locations flagged as hidden from the selectable list
            .filter((l) => !((l as LocWithMeta).is_hidden === true))
            .map((loc, index) => {
              const count = locationAvailability[loc.id] || 0;
              const isFull = count === 0;

              return (
                <Box
                  key={loc.id}
                  p="md"
                  onClick={() => !isFull && setSelectedLocationAction(loc.id)}
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
                    {effectiveMaxForSelected}
                  </Text>
                </Text>
              </div>
              <Group gap="xs">
                <ActionIcon
                  size="xl"
                  variant="default"
                  onClick={() =>
                    setLockerQtyAction(Math.max(1, Number(lockerQty) - 1))
                  }
                  disabled={Number(lockerQty) <= 1}
                >
                  -
                </ActionIcon>
                <NumberInput
                  variant="unstyled"
                  min={1}
                  max={effectiveMaxForSelected}
                  value={lockerQty}
                  onChange={(val) => setLockerQtyAction(val)}
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
                    setLockerQtyAction(
                      Math.min(effectiveMaxForSelected, Number(lockerQty) + 1),
                    )
                  }
                  disabled={Number(lockerQty) >= effectiveMaxForSelected}
                >
                  +
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        </>
      )}
    </Stack>
  );
};
