"use client";

import "mantine-datatable/styles.layer.css";
import React, { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import {
  Box,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  TextInput,
  Title,
  Tooltip,
  NumberInput,
  Text,
  Badge,
  ActionIcon,
  SimpleGrid,
  Select,
  Alert,
  Skeleton,
  Loader,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconRefresh,
  IconEye,
  IconEdit,
  IconSearch,
  IconPlus,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconArrowRight,
} from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { type DataTableProps } from "mantine-datatable";

// Lazy load DataTable to reduce initial bundle
const DataTable = dynamic(
  () => import("mantine-datatable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => (
      <Stack gap="xs" role="progressbar" aria-label="Loading locations table">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} h={40} />
        ))}
      </Stack>
    ),
  },
) as <T>(props: DataTableProps<T>) => React.ReactElement;
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

type Location = {
  id: string;
  name: string;
  code?: string | null;
  region?: string | null;
  city?: string | null;
  barangay?: string | null;
  zip?: string | null;
  total_lockers?: number | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SearchInput = React.memo(
  ({
    onSearch,
    searchQuery,
    loading,
  }: {
    onSearch: (value: string) => void;
    searchQuery: string;
    loading?: boolean;
  }) => {
    const [value, setValue] = useState(searchQuery);

    useEffect(() => {
      setValue(searchQuery);
    }, [searchQuery]);

    const handleSearch = () => {
      onSearch(value);
    };

    const handleClear = () => {
      setValue("");
      onSearch("");
    };

    const renderRightSection = () => {
      if (loading) return <Loader size="xs" />;
      if (value) {
        return (
          <Group gap={4}>
            <ActionIcon
              size="md"
              variant="transparent"
              c="dark.7"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <IconX size={18} aria-hidden="true" />
            </ActionIcon>
            <ActionIcon
              size="md"
              variant="transparent"
              c="indigo"
              onClick={handleSearch}
              aria-label="Submit search"
            >
              <IconArrowRight size={18} aria-hidden="true" />
            </ActionIcon>
          </Group>
        );
      }
      return (
        <ActionIcon
          size="md"
          variant="transparent"
          c="dark.7"
          onClick={handleSearch}
          aria-label="Submit search"
        >
          <IconArrowRight size={18} aria-hidden="true" />
        </ActionIcon>
      );
    };

    return (
      <TextInput
        placeholder="Search locations by name or code..."
        aria-label="Search locations"
        leftSection={<IconSearch size={16} aria-hidden="true" />}
        rightSectionWidth={value ? 70 : 42}
        rightSection={renderRightSection()}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSearch();
          }
        }}
        style={{ width: "100%" }}
      />
    );
  },
);
SearchInput.displayName = "SearchInput";

export default function MailroomLocations() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [filterRegion, setFilterRegion] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLocation, setViewLocation] = useState<Location | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [editing, setEditing] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search: query,
    region: filterRegion || "",
    city: filterCity || "",
    sortBy: sortBy || "",
  });

  const { data, isLoading, mutate, isValidating } = useSWR(
    `${API_ENDPOINTS.admin.mailroom.locations}?${queryParams.toString()}`,
    fetcher,
    { keepPreviousData: true },
  );

  useEffect(() => {
    if (!isValidating) {
      setIsSearching(false);
    }
  }, [isValidating]);

  const locations = (data?.data as Location[]) ?? [];
  const totalRecords = data?.pagination?.totalCount ?? 0;

  // Derive regions and cities from a separate fetch or use a subset if needed.
  // For the sake of this implementation, we'll use a subset or the user can search.
  // In lockers, locations were fetched separately. Here we'll just keep the useMemo for labels
  // based on the current page data for now, but in high-perf apps these should be lookups.
  const regions = useMemo(() => {
    const unique = new Set(locations.map((l) => l.region).filter(Boolean));
    return Array.from(unique).sort() as string[];
  }, [locations]);

  const cities = useMemo(() => {
    const unique = new Set(locations.map((l) => l.city).filter(Boolean));
    return Array.from(unique).sort() as string[];
  }, [locations]);

  const form = useForm({
    initialValues: {
      name: "",
      code: "",
      region: "",
      city: "",
      barangay: "",
      zip: "",
      total_lockers: 0,
    },
  });

  const editForm = useForm({
    initialValues: {
      name: "",
      code: "",
      region: "",
      city: "",
      barangay: "",
      zip: "",
      total_lockers: 0,
    },
  });

  useEffect(() => {
    setPage(1);
  }, [query, filterRegion, filterCity, sortBy]);

  useEffect(() => {
    if (createOpen || editOpen) {
      setFormError(null);
    }
  }, [createOpen, editOpen]);

  useEffect(() => {
    if (globalSuccess) {
      const timer = setTimeout(() => {
        setGlobalSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [globalSuccess]);

  const handleSearchSubmit = React.useCallback(
    (val: string) => {
      if (val === query && page === 1) return;
      setIsSearching(true);
      setQuery(val);
      setPage(1);
    },
    [query, page],
  );

  const clearFilters = () => {
    setQuery("");
    setFilterRegion(null);
    setFilterCity(null);
    setSortBy(null);
    setPage(1);
  };

  const hasFilters = Boolean(query || filterRegion || filterCity || sortBy);

  const handleCreate = form.onSubmit(async (values) => {
    setCreating(true);
    setFormError(null);
    try {
      const payload = {
        name: values.name,
        code: values.code || null,
        region: values.region || null,
        city: values.city || null,
        barangay: values.barangay || null,
        zip: values.zip || null,
        total_lockers: values.total_lockers || 0,
      };
      const res = await fetch(API_ENDPOINTS.admin.mailroom.locations, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (json && (json.error as string)) ?? "Failed to create location",
        );
      }

      setGlobalSuccess(
        (json && (json.message as string)) ?? "Location created successfully!",
      );
      setCreateOpen(false);
      form.reset();
      mutate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("create error", message);
      setFormError(message ?? "Failed to create location");
    } finally {
      setCreating(false);
    }
  });

  const openView = (loc: Location) => {
    setViewLocation(loc);
    setViewOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditLocation(loc);
    editForm.setValues({
      name: loc.name ?? "",
      code: loc.code ?? "",
      region: loc.region ?? "",
      city: loc.city ?? "",
      barangay: loc.barangay ?? "",
      zip: loc.zip ?? "",
      total_lockers: loc.total_lockers ?? 0,
    });
    setEditOpen(true);
  };

  const handleEdit = editForm.onSubmit(async (values) => {
    if (!editLocation || !editLocation.id) {
      setFormError("Missing location id. Cannot save changes.");
      return;
    }

    setEditing(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        name: values.name,
        code: values.code || null,
        region: values.region || null,
        city: values.city || null,
        barangay: values.barangay || null,
        zip: values.zip || null,
      };
      const res = await fetch(
        API_ENDPOINTS.admin.mailroom.location(editLocation.id),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (json && (json.error as string)) ?? "Failed to update location",
        );
      }

      setGlobalSuccess(
        (json && (json.message as string)) ?? "Location updated successfully!",
      );
      setEditOpen(false);
      setEditLocation(null);
      mutate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("edit error", message);
      setFormError(message ?? "Failed to update location");
    } finally {
      setEditing(false);
    }
  });

  if (!data && isLoading) {
    return (
      <Stack gap="md" aria-hidden="true">
        <Group justify="space-between">
          <Group>
            <Skeleton height={36} width={200} radius="sm" />
            <Skeleton height={36} width={150} radius="sm" />
            <Skeleton height={36} width={150} radius="sm" />
          </Group>
          <Skeleton height={36} width={100} radius="sm" />
        </Group>
        <Skeleton height={400} radius="sm" />
      </Stack>
    );
  }

  return (
    <Stack align="center" gap="lg" w="100%">
      {globalSuccess && (
        <Alert
          variant="light"
          color="green"
          title="Success"
          icon={<IconCheck size={16} />}
          withCloseButton
          onClose={() => setGlobalSuccess(null)}
          w="100%"
          maw={1200}
          aria-live="polite"
        >
          {globalSuccess}
        </Alert>
      )}

      <Paper
        p="xl"
        radius="lg"
        withBorder
        shadow="sm"
        w="100%"
        component="section"
        aria-labelledby="locations-management-title"
      >
        <Title
          order={2}
          id="locations-management-title"
          style={{ display: "none" }}
        >
          Mailroom Locations Management
        </Title>
        {isMobile ? (
          <Stack mb="md" gap="md">
            <SearchInput
              onSearch={handleSearchSubmit}
              searchQuery={query}
              loading={isSearching}
            />
            <Group grow gap="xs">
              <Select
                placeholder="Region"
                aria-label="Filter by region"
                data={regions}
                value={filterRegion}
                onChange={setFilterRegion}
                clearable
                searchable
              />
              <Select
                placeholder="City"
                aria-label="Filter by city"
                data={cities}
                value={filterCity}
                onChange={setFilterCity}
                clearable
                searchable
              />
            </Group>
            <Group grow gap="xs">
              <Select
                placeholder="Sort By"
                aria-label="Sort locations"
                data={[
                  { value: "name_asc", label: "Name (A-Z)" },
                  { value: "lockers_desc", label: "Lockers (High-Low)" },
                  { value: "lockers_asc", label: "Lockers (Low-High)" },
                ]}
                value={sortBy}
                onChange={setSortBy}
                clearable
              />
              <Button
                leftSection={<IconPlus size={16} aria-hidden="true" />}
                onClick={() => {
                  setCreateOpen(true);
                  setGlobalSuccess(null);
                }}
                color="#1e3a8a"
                aria-label="Create new mailroom location"
              >
                Create
              </Button>
            </Group>
            {hasFilters && (
              <Button
                variant="subtle"
                color="red.8"
                size="sm"
                onClick={clearFilters}
                fullWidth
              >
                Clear Filters
              </Button>
            )}
          </Stack>
        ) : (
          <Group mb="md" gap="xs" wrap="nowrap">
            <div style={{ flex: 1, minWidth: 200 }}>
              <SearchInput
                onSearch={handleSearchSubmit}
                searchQuery={query}
                loading={isSearching}
              />
            </div>
            <Select
              placeholder="Region"
              aria-label="Filter by region"
              data={regions}
              value={filterRegion}
              onChange={setFilterRegion}
              clearable
              searchable
              style={{ width: 150, flexShrink: 0 }}
            />
            <Select
              placeholder="City"
              aria-label="Filter by city"
              data={cities}
              value={filterCity}
              onChange={setFilterCity}
              clearable
              searchable
              style={{ width: 150, flexShrink: 0 }}
            />
            <Select
              placeholder="Sort By"
              aria-label="Sort locations"
              data={[
                { value: "name_asc", label: "Name (A-Z)" },
                { value: "lockers_desc", label: "Lockers (High-Low)" },
                { value: "lockers_asc", label: "Lockers (Low-High)" },
              ]}
              value={sortBy}
              onChange={setSortBy}
              clearable
              style={{ width: 180, flexShrink: 0 }}
            />
            {hasFilters && (
              <Button
                variant="subtle"
                color="red.8"
                size="sm"
                onClick={clearFilters}
                aria-label="Clear all filters"
                style={{ flexShrink: 0 }}
              >
                Clear Filters
              </Button>
            )}
            <Tooltip label="Refresh list">
              <ActionIcon
                variant="subtle"
                color="dark.7"
                size="lg"
                onClick={() => mutate()}
                aria-label="Refresh locations list"
                style={{ flexShrink: 0 }}
              >
                <IconRefresh size={16} aria-hidden="true" />
              </ActionIcon>
            </Tooltip>
            <Button
              leftSection={<IconPlus size={16} aria-hidden="true" />}
              onClick={() => {
                setCreateOpen(true);
                setGlobalSuccess(null);
              }}
              color="#1e3a8a"
              aria-label="Create new mailroom location"
              style={{ flexShrink: 0 }}
            >
              Create Location
            </Button>
          </Group>
        )}

        <div
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: "400px",
          }}
        >
          <DataTable<Location>
            striped
            aria-label="Mailroom locations list"
            withTableBorder={false}
            borderRadius="lg"
            withColumnBorders={false}
            verticalSpacing="md"
            highlightOnHover
            records={locations}
            fetching={isLoading}
            minHeight={minTableHeight(pageSize)}
            totalRecords={totalRecords}
            recordsPerPage={pageSize}
            page={page}
            onPageChange={(p) => setPage(p)}
            recordsPerPageOptions={[10, 20, 50]}
            onRecordsPerPageChange={setPageSize}
            paginationText={({ from, to, totalRecords }) =>
              `Showing ${from}–${to} of ${totalRecords}`
            }
            recordsPerPageLabel="Locations per page"
            columns={[
              {
                accessor: "name",
                title: "Name",
                width: 200,
                render: ({ name }: Location) => (
                  <Text fw={700} c="dark.7" size="sm">
                    {name}
                  </Text>
                ),
              },
              {
                accessor: "code",
                title: "Code",
                width: 100,
                render: ({ code }: Location) =>
                  code ? (
                    <Text fw={700} c="dark.7" size="sm">
                      {code}
                    </Text>
                  ) : (
                    <Text size="sm" c="dark.7">
                      —
                    </Text>
                  ),
              },
              {
                accessor: "region",
                title: "Region",
                render: ({ region }: Location) => (
                  <Text size="sm" c="dark.7" fw={500}>
                    {region ?? "—"}
                  </Text>
                ),
              },
              {
                accessor: "city",
                title: "City",
                render: ({ city }: Location) => (
                  <Text size="sm" c="dark.7" fw={500}>
                    {city ?? "—"}
                  </Text>
                ),
              },
              {
                accessor: "barangay",
                title: "Barangay",
                render: ({ barangay }: Location) => (
                  <Text size="sm" c="dark.7" fw={500}>
                    {barangay ?? "—"}
                  </Text>
                ),
              },
              {
                accessor: "zip",
                title: "Zip",
                width: 100,
                render: ({ zip }: Location) => (
                  <Text size="sm" c="dark.7">
                    {zip ?? "—"}
                  </Text>
                ),
              },
              {
                accessor: "total_lockers",
                title: "Total Lockers",
                width: 140,
                textAlign: "center",
                render: ({ total_lockers }: Location) => (
                  <Badge
                    color="blue"
                    variant="light"
                    size="md"
                    aria-label={`${total_lockers ?? 0} total lockers`}
                  >
                    {total_lockers ?? 0}
                  </Badge>
                ),
              },
              {
                accessor: "actions",
                title: "Actions",
                width: 100,
                textAlign: "right" as const,
                render: (loc: Location) => (
                  <Group gap="xs" justify="flex-end">
                    <Tooltip label="View">
                      <ActionIcon
                        variant="subtle"
                        color="dark.7"
                        size="lg"
                        onClick={() => openView(loc)}
                        aria-label={`View details of ${loc.name}`}
                      >
                        <IconEye size={16} aria-hidden="true" />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Edit">
                      <ActionIcon
                        variant="subtle"
                        color="blue.7"
                        size="lg"
                        onClick={() => {
                          openEdit(loc);
                          setGlobalSuccess(null);
                        }}
                        aria-label={`Edit ${loc.name}`}
                      >
                        <IconEdit size={16} aria-hidden="true" />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                ),
              },
            ]}
            noRecordsText="No locations found"
          />
        </div>
      </Paper>

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title={
          <Text id="create-location-title" fw={700}>
            Create Mailroom Location
          </Text>
        }
        centered
        aria-labelledby="create-location-title"
      >
        <form onSubmit={handleCreate}>
          <Stack>
            {formError && (
              <Alert
                variant="light"
                color="red"
                title="Error"
                icon={<IconAlertCircle size={16} />}
                withCloseButton
                onClose={() => setFormError(null)}
                aria-live="assertive"
              >
                {formError}
              </Alert>
            )}

            <TextInput
              required
              label="Name"
              placeholder="Main Office - Makati"
              {...form.getInputProps("name")}
            />
            <TextInput
              required
              label="Location Code"
              placeholder="MKT"
              description="Used as prefix for lockers (e.g. MKT-001...100)"
              {...form.getInputProps("code")}
            />
            <TextInput
              required
              label="Region"
              placeholder="NCR"
              {...form.getInputProps("region")}
            />
            <TextInput
              required
              label="City"
              placeholder="Makati"
              {...form.getInputProps("city")}
            />
            <TextInput
              required
              label="Barangay"
              placeholder="Bel-Air"
              {...form.getInputProps("barangay")}
            />
            <TextInput
              required
              label="Zip"
              placeholder="1227"
              {...form.getInputProps("zip")}
            />
            <NumberInput
              label="Total Lockers"
              min={1}
              {...form.getInputProps("total_lockers")}
              required
            />
            <Group justify="flex-end" mt="sm">
              <Button
                variant="default"
                onClick={() => setCreateOpen(false)}
                aria-label="Cancel location creation"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={creating}
                aria-label="Create new location"
                disabled={creating}
              >
                Create Location
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={viewOpen}
        onClose={() => setViewOpen(false)}
        title={
          <Text id="view-location-title" fw={700}>
            Location Details
          </Text>
        }
        centered
        size="lg"
        aria-labelledby="view-location-title"
      >
        {viewLocation && (
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Box>
                <Text size="xs" c="dark.4" tt="uppercase" fw={700}>
                  Location Name
                </Text>
                <Group gap="xs">
                  <Title order={2}>{viewLocation.name}</Title>
                  {viewLocation.code && (
                    <Badge
                      variant="outline"
                      size="lg"
                      aria-label={`Location code: ${viewLocation.code}`}
                    >
                      {viewLocation.code}
                    </Badge>
                  )}
                </Group>
              </Box>
              <Badge
                size="lg"
                variant="light"
                color="blue"
                aria-label={`${viewLocation.total_lockers ?? 0} total lockers`}
              >
                {viewLocation.total_lockers ?? 0} Lockers
              </Badge>
            </Group>

            <Paper
              withBorder
              p="md"
              radius="md"
              bg="var(--mantine-color-gray-0)"
            >
              <SimpleGrid cols={2} spacing="md" verticalSpacing="lg">
                <Box>
                  <Text size="xs" c="dark.4" tt="uppercase" fw={700}>
                    Region
                  </Text>
                  <Text fw={500} size="sm">
                    {viewLocation.region || "—"}
                  </Text>
                </Box>
                <Box>
                  <Text size="xs" c="dark.4" tt="uppercase" fw={700}>
                    City
                  </Text>
                  <Text fw={500} size="sm">
                    {viewLocation.city || "—"}
                  </Text>
                </Box>
                <Box>
                  <Text size="xs" c="dark.4" tt="uppercase" fw={700}>
                    Barangay
                  </Text>
                  <Text fw={500} size="sm">
                    {viewLocation.barangay || "—"}
                  </Text>
                </Box>
                <Box>
                  <Text size="xs" c="dark.3" tt="uppercase" fw={700}>
                    Zip Code
                  </Text>
                  <Text fw={500} size="sm">
                    {viewLocation.zip || "—"}
                  </Text>
                </Box>
              </SimpleGrid>
            </Paper>

            <Group justify="flex-end" mt="sm">
              <Button
                variant="default"
                onClick={() => setViewOpen(false)}
                aria-label="Close location details"
              >
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title={
          <Text id="edit-location-title" fw={700}>
            Edit Location
          </Text>
        }
        centered
        aria-labelledby="edit-location-title"
      >
        <form onSubmit={handleEdit}>
          <Stack>
            {formError && (
              <Alert
                variant="light"
                color="red"
                title="Error"
                icon={<IconAlertCircle size={16} />}
                withCloseButton
                onClose={() => setFormError(null)}
                aria-live="assertive"
              >
                {formError}
              </Alert>
            )}

            <TextInput
              label="Name"
              required
              {...editForm.getInputProps("name")}
            />
            <TextInput
              label="Location Code"
              required
              {...editForm.getInputProps("code")}
              readOnly
            />
            <TextInput
              label="Region"
              required
              {...editForm.getInputProps("region")}
            />
            <TextInput
              label="City"
              required
              {...editForm.getInputProps("city")}
            />
            <TextInput
              label="Barangay"
              required
              {...editForm.getInputProps("barangay")}
            />
            <TextInput
              label="Zip"
              required
              {...editForm.getInputProps("zip")}
            />
            <TextInput
              label="Total Lockers"
              required
              {...editForm.getInputProps("total_lockers")}
              readOnly
            />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={editing}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}

function minTableHeight(pageSize: number) {
  return 52 * pageSize + 50;
}
