"use client";

import React, { useState, useEffect } from "react";
import { Select, SimpleGrid, TextInput } from "@mantine/core";
import useSWR from "swr";
import {
  getRegion,
  getProvince,
  getCity,
  getBarangay,
} from "@/app/actions/get";
import { CustomerKycAddress } from "@/utils/types";

type AddressCascadingSelectsProps = {
  onChange: (data: CustomerKycAddress) => void;
  disabled?: boolean;
  initialData?: Partial<CustomerKycAddress>;
};

const formatLabel = (text: string) => text?.replace(/_/g, " ") || "";

export function AddressCascadingSelects({
  onChange,
  disabled,
  initialData,
}: AddressCascadingSelectsProps) {
  // IDs for fetching
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    initialData?.region_id || null,
  );
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(
    initialData?.province_id || null,
  );
  const [selectedCityId, setSelectedCityId] = useState<string | null>(
    initialData?.city_id || null,
  );
  const [selectedBarangayId, setSelectedBarangayId] = useState<string | null>(
    initialData?.barangay_id || null,
  );

  // Text values for the parent form
  const [region, setRegion] = useState(initialData?.region || "");
  const [province, setProvince] = useState(initialData?.province || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [barangay, setBarangay] = useState(initialData?.barangay || "");
  const [postal, setPostal] = useState(initialData?.barangay_zip_code || "");

  // SWR Fetchers
  const { data: regionsData } = useSWR("regions", () => getRegion());

  const { data: provincesData } = useSWR(
    selectedRegionId ? ["provinces", selectedRegionId] : null,
    ([, id]) => getProvince({ regionId: id }),
  );

  const { data: citiesData } = useSWR(
    selectedProvinceId ? ["cities", selectedProvinceId] : null,
    ([, id]) => getCity({ provinceId: id }),
  );

  const { data: barangaysData } = useSWR(
    selectedCityId ? ["barangays", selectedCityId] : null,
    ([, id]) => getBarangay({ cityId: id }),
  );

  // Transform for Mantine Select
  const regions =
    regionsData?.map((r) => ({
      label: formatLabel(r.region),
      value: r.region_id,
    })) || [];

  const provinces =
    provincesData?.map((p) => ({
      label: formatLabel(p.province),
      value: p.province_id,
    })) || [];

  const cities =
    citiesData?.map((c) => ({
      label: formatLabel(c.city),
      value: c.city_id,
    })) || [];

  const barangays =
    barangaysData?.map((b) => ({
      label: formatLabel(b.barangay),
      value: b.barangay_id,
      zip: b.barangay_zip_code,
    })) || [];

  // Notify parent of changes
  useEffect(() => {
    onChange({
      region,
      province,
      city,
      barangay,
      barangay_zip_code: postal,
      region_id: selectedRegionId || "",
      province_id: selectedProvinceId || "",
      city_id: selectedCityId || "",
      barangay_id: selectedBarangayId || "",
    });
  }, [
    region,
    province,
    city,
    barangay,
    postal,
    selectedRegionId,
    selectedProvinceId,
    selectedCityId,
    selectedBarangayId,
  ]);

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <Select
        label="Region"
        placeholder="Select Region"
        data={regions}
        value={selectedRegionId}
        onChange={(val) => {
          setSelectedRegionId(val);
          const label = regions.find((r) => r.value === val)?.label;
          setRegion(label || "");
          // Reset children
          setSelectedProvinceId(null);
          setProvince("");
          setSelectedCityId(null);
          setCity("");
          setSelectedBarangayId(null);
          setBarangay("");
          setPostal("");
        }}
        required
        disabled={disabled}
        searchable
        clearable
      />
      <Select
        label="Province"
        placeholder="Select Province"
        data={provinces}
        value={selectedProvinceId}
        onChange={(val) => {
          setSelectedProvinceId(val);
          const label = provinces.find((p) => p.value === val)?.label;
          setProvince(label || "");
          // Reset children
          setSelectedCityId(null);
          setCity("");
          setSelectedBarangayId(null);
          setBarangay("");
          setPostal("");
        }}
        required
        disabled={disabled || !selectedRegionId}
        searchable
        clearable
      />
      <Select
        label="City/Municipality"
        placeholder="Select City/Municipality"
        data={cities}
        value={selectedCityId}
        onChange={(val) => {
          setSelectedCityId(val);
          const label = cities.find((c) => c.value === val)?.label;
          setCity(label || "");
          // Reset children
          setSelectedBarangayId(null);
          setBarangay("");
          setPostal("");
        }}
        required
        disabled={disabled || !selectedProvinceId}
        searchable
        clearable
      />
      <Select
        label="Barangay"
        placeholder="Select Barangay"
        data={barangays}
        value={selectedBarangayId}
        onChange={(val) => {
          setSelectedBarangayId(val);
          const b = barangays.find((bar) => bar.value === val);
          setBarangay(b?.label || "");
          setPostal(b?.zip || "");
        }}
        required
        disabled={disabled || !selectedCityId}
        searchable
        clearable
      />
      <TextInput
        label="Postal Code"
        placeholder="Postal Code"
        value={postal}
        onChange={(e) => setPostal(e.currentTarget.value.replace(/\D/g, ""))}
        inputMode="numeric"
        pattern="\d*"
        required
        disabled={disabled || !!selectedBarangayId}
      />
    </SimpleGrid>
  );
}
