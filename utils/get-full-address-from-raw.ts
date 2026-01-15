import { LocationObj, RawRow } from "./types";

/**
 * Formats full address from raw location data
 */
export const getFullAddressFromRaw = (
  raw: RawRow | null | undefined,
): string | null => {
  if (!raw) return null;

  const loc = (raw.mailroom_location_table as LocationObj | undefined) ?? {};

  if (typeof loc.formatted_address === "string") {
    return String(loc.formatted_address);
  }

  const parts: string[] = [];

  const name =
    (loc.mailroom_location_name as string | undefined) ??
    ((raw as Record<string, unknown>)["location_name"] as string | undefined) ??
    null;
  if (name) parts.push(String(name));

  const street =
    (loc.address_line as string | undefined) ??
    (loc.line1 as string | undefined) ??
    null;
  if (street) parts.push(String(street));

  const city = (loc.mailroom_location_city as string | undefined) ?? null;
  const province = (loc.mailroom_location_region as string | undefined) ?? null;
  const postal = (loc.mailroom_location_zip as string | undefined) ?? null;
  const tail = [city, province, postal].filter(Boolean).join(", ");
  if (tail) parts.push(tail);

  const out = parts.filter(Boolean).join(", ").trim();
  return out || null;
};
