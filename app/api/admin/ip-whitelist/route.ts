import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminListIpWhitelist, getUserRole } from "@/app/actions/get";
import { adminCreateIpWhitelist } from "@/app/actions/post";
import { logActivity } from "@/lib/activity-log";
import { logApiError } from "@/lib/error-log";
import {
  findMatchingWhitelistIds,
  invalidateAdminIpWhitelistCache,
  normalizeWhitelistInput,
} from "@/lib/admin-ip-whitelist";
import { resolveClientIp } from "@/lib/ip-utils";

const ALLOWED_ADMIN_ROLES = ["admin", "owner"] as const;

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getUserRole(user.id);
    if (!role || !ALLOWED_ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const entries = await adminListIpWhitelist();
    const clientIp = resolveClientIp(req.headers, null);
    const currentMatchIds = clientIp
      ? findMatchingWhitelistIds(clientIp, entries)
      : [];

    return NextResponse.json({
      entries,
      total_count: entries.length,
      current_ip: clientIp,
      current_match_ids: currentMatchIds,
    });
  } catch (err: unknown) {
    console.error("API error fetching IP whitelist:", err);
    const errorMessage = err instanceof Error ? err.message : "Server error";
    void logApiError(req, { status: 500, message: errorMessage, error: err });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getUserRole(user.id);
    if (!role || !ALLOWED_ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = (await req.json()) as {
      ip_cidr?: string;
      description?: string | null;
    };

    let normalizedCidr: string;
    try {
      normalizedCidr = normalizeWhitelistInput(payload.ip_cidr ?? "");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid IP or CIDR.";
      void logApiError(req, { status: 400, message, error: err });
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const description =
      typeof payload.description === "string" && payload.description.trim()
        ? payload.description.trim()
        : null;

    let data;
    try {
      data = await adminCreateIpWhitelist({
        ipCidr: normalizedCidr,
        description,
        createdBy: user.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Server error";
      if (message.toLowerCase().includes("duplicate")) {
        return NextResponse.json(
          { error: "IP or CIDR already exists in the whitelist." },
          { status: 409 },
        );
      }
      throw err;
    }

    invalidateAdminIpWhitelistCache();

    await logActivity({
      userId: user.id,
      action: "CREATE",
      type: "ADMIN_ACTION",
      entityType: "ADMIN_IP_WHITELIST",
      entityId: data.admin_ip_whitelist_id,
      details: {
        ip_cidr: data.ip_cidr,
        description: data.description,
      },
    });

    return NextResponse.json({ entry: data }, { status: 201 });
  } catch (err: unknown) {
    console.error("API error creating IP whitelist entry:", err);
    const errorMessage = err instanceof Error ? err.message : "Server error";
    void logApiError(req, { status: 500, message: errorMessage, error: err });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
