import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminListIpWhitelist, getUserRole } from "@/app/actions/get";
import { adminUpdateIpWhitelist } from "@/app/actions/update";
import { adminDeleteIpWhitelist } from "@/app/actions/delete";
import { logActivity } from "@/lib/activity-log";
import {
  invalidateAdminIpWhitelistCache,
  isIpWhitelisted,
  normalizeWhitelistInput,
} from "@/lib/admin-ip-whitelist";
import { resolveClientIp } from "@/lib/ip-utils";

const ALLOWED_ADMIN_ROLES = ["admin", "owner"] as const;

type RouteParams = {
  params: { id: string };
};

export async function PUT(req: Request, { params }: RouteParams) {
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
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const description =
      typeof payload.description === "string" && payload.description.trim()
        ? payload.description.trim()
        : null;

    const entries = await adminListIpWhitelist();
    const existing = entries.find(
      (entry) => entry.admin_ip_whitelist_id === params.id,
    );

    if (!existing) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    const clientIp = resolveClientIp(req.headers, null);
    if (clientIp) {
      const remaining = entries.filter(
        (entry) => entry.admin_ip_whitelist_id !== params.id,
      );
      const stillAllowed = isIpWhitelisted(clientIp, remaining);
      const newAllows = isIpWhitelisted(clientIp, [
        { ip_cidr: normalizedCidr },
      ]);

      if (!stillAllowed && !newAllows) {
        return NextResponse.json(
          {
            error:
              "Update would remove your current IP from the whitelist. Add another entry first.",
          },
          { status: 400 },
        );
      }
    }

    let data;
    try {
      data = await adminUpdateIpWhitelist({
        id: params.id,
        ipCidr: normalizedCidr,
        description,
        updatedBy: user.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Server error";
      if (message.toLowerCase().includes("duplicate")) {
        return NextResponse.json(
          { error: "IP or CIDR already exists in the whitelist." },
          { status: 409 },
        );
      }
      if (message.toLowerCase().includes("not found")) {
        return NextResponse.json(
          { error: "Entry not found." },
          { status: 404 },
        );
      }
      throw err;
    }

    invalidateAdminIpWhitelistCache();

    await logActivity({
      userId: user.id,
      action: "UPDATE",
      type: "ADMIN_ACTION",
      entityType: "ADMIN_IP_WHITELIST",
      entityId: data.admin_ip_whitelist_id,
      details: {
        previous: {
          ip_cidr: existing.ip_cidr,
          description: existing.description,
        },
        next: {
          ip_cidr: data.ip_cidr,
          description: data.description,
        },
      },
    });

    return NextResponse.json({ entry: data });
  } catch (err: unknown) {
    console.error("API error updating IP whitelist entry:", err);
    const errorMessage = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
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
    const existing = entries.find(
      (entry) => entry.admin_ip_whitelist_id === params.id,
    );

    if (!existing) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    const remaining = entries.filter(
      (entry) => entry.admin_ip_whitelist_id !== params.id,
    );

    if (remaining.length === 0) {
      return NextResponse.json(
        { error: "Cannot remove the last whitelist entry." },
        { status: 400 },
      );
    }

    const clientIp = resolveClientIp(req.headers, null);
    if (clientIp && !isIpWhitelisted(clientIp, remaining)) {
      return NextResponse.json(
        {
          error:
            "Delete would remove your current IP from the whitelist. Add another entry first.",
        },
        { status: 400 },
      );
    }

    try {
      await adminDeleteIpWhitelist({ id: params.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Server error";
      if (message.toLowerCase().includes("not found")) {
        return NextResponse.json(
          { error: "Entry not found." },
          { status: 404 },
        );
      }
      throw err;
    }

    invalidateAdminIpWhitelistCache();

    await logActivity({
      userId: user.id,
      action: "DELETE",
      type: "ADMIN_ACTION",
      entityType: "ADMIN_IP_WHITELIST",
      entityId: existing.admin_ip_whitelist_id,
      details: {
        ip_cidr: existing.ip_cidr,
        description: existing.description,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("API error deleting IP whitelist entry:", err);
    const errorMessage = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
