import { notifications } from "@mantine/notifications";

export const firstOf = <T>(v: T | T[] | undefined | null): T | null => {
  if (v === undefined || v === null) return null;
  return Array.isArray(v) ? ((v[0] as T) ?? null) : (v as T);
};

export const getProp = <T>(
  obj: Record<string, unknown> | null,
  key: string,
): T | undefined => (obj ? (obj[key] as unknown as T | undefined) : undefined);

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

export const getString = (
  obj: Record<string, unknown> | undefined,
  ...keys: string[]
): string | undefined => {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
  }
  return undefined;
};

export const getFullAddressFromRaw = (
  raw:
    | {
        formatted_address?: string;
        mailroom_location_name?: string;
        mailroom_location_city?: string;
        mailroom_location_region?: string;
        mailroom_location_zip?: string;
        address_line?: string;
        name?: string;
        address?: string;
        city?: string;
        region?: string;
        postal?: string;
        [key: string]: unknown;
      }
    | Array<{ [key: string]: unknown }>
    | null
    | undefined,
): string | null => {
  if (!raw) return null;
  const loc = Array.isArray(raw)
    ? (raw[0] as Record<string, unknown>)
    : (raw as Record<string, unknown>);
  if (!loc) return null;
  if (typeof loc.formatted_address === "string" && loc.formatted_address.trim())
    return String(loc.formatted_address).trim();

  const parts: string[] = [];
  const name = (loc.mailroom_location_name ?? loc.name) as string | undefined;
  if (name) parts.push(String(name));
  const street = (loc.address_line ?? loc.address ?? loc.line1) as
    | string
    | undefined;
  if (street) parts.push(String(street));
  const city = (loc.mailroom_location_city ?? loc.city) as string | undefined;
  const province = (loc.mailroom_location_region ?? loc.region) as
    | string
    | undefined;
  const postal = (loc.mailroom_location_zip ?? loc.postal) as
    | string
    | undefined;
  const tail = [city, province, postal].filter(Boolean).join(", ");
  if (tail) parts.push(tail);
  const out = parts.filter(Boolean).join(", ").trim();
  return out || null;
};

export const copyFullShippingAddress = async (
  src: Record<string, unknown> | null,
): Promise<void> => {
  const code = getProp<string>(src, "mailroom_code") ?? "-";
  const loc =
    firstOf(
      getProp<Record<string, unknown> | Record<string, unknown>[] | null>(
        src,
        "mailroom_location_table",
      ),
    ) ??
    firstOf(
      getProp<Record<string, unknown> | Record<string, unknown>[] | null>(
        src,
        "mailroom_locations",
      ),
    ) ??
    getProp<Record<string, unknown> | null>(src, "location") ??
    null;
  const full =
    (getFullAddressFromRaw(loc) ??
      [loc?.address, loc?.city, loc?.region].filter(Boolean).join(", ")) ||
    null;
  const txt = `${code ? `${code} ` : ""}${full ?? ""}`.trim();
  if (!txt) {
    notifications.show({
      title: "Nothing to copy",
      message: "No full address available",
      color: "yellow",
    });
    return;
  }
  try {
    await navigator.clipboard.writeText(txt);
    notifications.show({
      title: "Copied",
      message: "Full shipping address copied to clipboard",
      color: "teal",
    });
  } catch (e: unknown) {
    console.error("copy failed", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    notifications.show({
      title: "Copy failed",
      message: errorMessage,
      color: "red",
    });
  }
};

export const getSubscriptionExpiry = (s: unknown): string | null => {
  if (!s) return null;
  if (Array.isArray(s) && s.length > 0) {
    return String(
      (s[0] as Record<string, unknown>)?.subscription_expires_at ?? null,
    );
  }
  if (typeof s === "object") {
    return String(
      (s as Record<string, unknown>)?.subscription_expires_at ?? null,
    );
  }
  return null;
};

export const addMonths = (iso?: string | null, months = 0): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
};
