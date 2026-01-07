import {
  AdminClaim,
  ClaimWithUrl,
  ReferralRow,
  RpcAdminClaim,
  RpcClaim,
  UserAddressRow,
} from "./types";

export const getStatusFormat = (status: string = ""): string => {
  const colorGroups = {
    green: ["VERIFIED", "PAID", "NORMAL"],
    blue: [],
    yellow: ["SUBMITTED", "PENDING"],
    red: ["REJECTED", "FULL"],
    orange: ["NEAR FULL"],
  };

  const statusToColor = Object.entries(colorGroups).reduce(
    (acc, [color, statuses]) => {
      statuses.forEach((s) => (acc[s] = color));
      return acc;
    },
    {} as Record<string, string>,
  );

  return statusToColor[status.toUpperCase()] || "gray";
};

export const pickString = (rec: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string") return v;
  }
  return null;
};

export const pickNumber = (rec: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "number") return v;
  }
  return undefined;
};

export const maskAccount = (value?: string | null) => {
  if (!value) return "—";
  const v = String(value);
  if (v.length <= 6) return v.replace(/.(?=.{2})/g, "*");
  return v.slice(0, 3) + v.slice(3, -3).replace(/./g, "*") + v.slice(-3);
};

export const pickStringValue = (
  record: ReferralRow,
  fields: (keyof ReferralRow)[],
): string | null => {
  for (const key of fields) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
};

export const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

export const toBoolean = (value: unknown): boolean =>
  value === true || value === "true";

export const toStringOrNull = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const normalizeClaim = (
  raw: RpcClaim | unknown,
): ClaimWithUrl | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = toStringOrNull(record.id);
  const userId = toStringOrNull(record.user_id);

  if (!id || !userId) {
    return null;
  }

  return {
    id,
    user_id: userId,
    payment_method: toStringOrNull(record.payment_method),
    account_details: toStringOrNull(record.account_details),
    amount: toNumberOrNull(record.amount),
    status: toStringOrNull(record.status),
    referral_count: toNumberOrNull(record.referral_count),
    created_at: toStringOrNull(record.created_at),
    processed_at: toStringOrNull(record.processed_at),
    proof_path: toStringOrNull(record.proof_path),
    proof_url: toStringOrNull(record.proof_url),
    total_referrals: toNumberOrNull(record.total_referrals),
  };
};

export const normalizeAdminClaim = (
  raw: RpcAdminClaim | unknown,
): AdminClaim | null => {
  const base = normalizeClaim(raw);
  if (!base) {
    return null;
  }

  const record = raw as RpcAdminClaim;
  return {
    ...base,
    user: record.user ?? null,
  };
};

export const normalizeImageUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  if (typeof window !== "undefined") {
    const prefix = url.startsWith("/") ? "" : "/";
    return `${window.location.origin}${prefix}${url}`;
  }
  return url;
};

export const parseAddressRow = (input: unknown): UserAddressRow => {
  if (!input) {
    throw new Error("Address payload missing");
  }

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as UserAddressRow;
      return parsed;
    } catch {
      throw new Error("Invalid address payload");
    }
  }

  return input as UserAddressRow;
};

export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to fetch ${url}`);
  }
  return res.json().catch(() => ({}));
};

export const addMonths = (iso?: string | null, months = 0): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
};
