import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isIpInCidr, normalizeCidr } from "@/lib/ip-utils";

export type AdminIpWhitelistRecord = {
  admin_ip_whitelist_id: string;
  ip_cidr: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

type WhitelistCache = {
  entries: AdminIpWhitelistRecord[];
  expiresAt: number;
};

const CACHE_TTL_MS = 60_000;

function getCache(): WhitelistCache | null {
  const cached = (globalThis as { __adminIpWhitelistCache?: WhitelistCache })
    .__adminIpWhitelistCache;
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) return null;
  return cached;
}

function setCache(entries: AdminIpWhitelistRecord[]): void {
  (
    globalThis as { __adminIpWhitelistCache?: WhitelistCache }
  ).__adminIpWhitelistCache = {
    entries,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

export function invalidateAdminIpWhitelistCache(): void {
  (
    globalThis as { __adminIpWhitelistCache?: WhitelistCache }
  ).__adminIpWhitelistCache = undefined;
}

export async function getAdminIpWhitelist(
  forceRefresh: boolean = false,
): Promise<AdminIpWhitelistRecord[]> {
  if (!forceRefresh) {
    const cached = getCache();
    if (cached) return cached.entries;
  }

  const supabaseAdmin = createSupabaseServiceClient();
  const { data, error } = await supabaseAdmin
    .from("admin_ip_whitelist_table")
    .select(
      "admin_ip_whitelist_id, ip_cidr, description, created_at, created_by, updated_at, updated_by",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const entries = (data ?? []) as AdminIpWhitelistRecord[];
  setCache(entries);
  return entries;
}

export function isIpWhitelisted(
  ip: string,
  entries: Array<Pick<AdminIpWhitelistRecord, "ip_cidr">>,
): boolean {
  return entries.some((entry) => {
    try {
      return isIpInCidr(ip, entry.ip_cidr);
    } catch {
      return false;
    }
  });
}

export function findMatchingWhitelistIds(
  ip: string,
  entries: AdminIpWhitelistRecord[],
): string[] {
  return entries
    .filter((entry) => {
      try {
        return isIpInCidr(ip, entry.ip_cidr);
      } catch {
        return false;
      }
    })
    .map((entry) => entry.admin_ip_whitelist_id);
}

export function normalizeWhitelistInput(input: string): string {
  return normalizeCidr(input);
}
