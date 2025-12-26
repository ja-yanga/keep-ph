import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // This helper automatically handles session refresh and picks up
    // the Authorization: Bearer token from headers OR cookies via createClient().
    // Passing isAPI=true throws an error (instead of redirecting) for proper API responses.
    const isAPI = true;
    const { user } = await getAuthenticatedUser(isAPI);

    const userId = user.id;

    // Use RPC function to get registrations
    const supabaseAdmin = createSupabaseServiceClient();
    const { data, error } = await supabaseAdmin.rpc(
      "get_user_mailroom_registrations",
      {
        input_user_id: userId,
      },
    );

    if (error) {
      console.error("registrations RPC error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to load registrations" },
        { status: 500 },
      );
    }

    // Parse data if it's a string, otherwise use as is
    let registrations: unknown[] = [];
    try {
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      registrations = Array.isArray(payload) ? payload : [];
    } catch (parseError) {
      console.error("Failed to parse RPC response:", parseError);
      registrations = [];
    }

    // fetch overall totals and per-registration counts and merge them in
    try {
      const { data: totalsData, error: totalsErr } = await supabaseAdmin.rpc(
        "get_user_mailroom_stats",
        { input_user_id: userId },
      );
      if (totalsErr) throw totalsErr;

      const toStr = (v: unknown): string =>
        v === undefined || v === null ? "" : String(v);

      let totals: Record<string, unknown> | null = null;
      if (totalsData !== undefined && totalsData !== null) {
        totals =
          typeof totalsData === "string"
            ? JSON.parse(totalsData)
            : (totalsData as Record<string, unknown>);
      }

      const { data: regStatsData, error: regStatsErr } =
        await supabaseAdmin.rpc("get_user_mailroom_registration_stats", {
          input_user_id: userId,
        });
      if (regStatsErr) {
        // log RPC error but continue to fallback
        console.error(
          "get_user_mailroom_registration_stats rpc error:",
          regStatsErr,
        );
      }

      // normalize regStats (may be string or array) without using `any`
      let regStatsRaw: unknown[] = [];
      if (regStatsData !== undefined && regStatsData !== null) {
        regStatsRaw =
          typeof regStatsData === "string"
            ? (JSON.parse(regStatsData) as unknown[])
            : (regStatsData as unknown[]);
      }

      type RegCounts = { stored: number; pending: number; released: number };
      const regMap = new Map<string, RegCounts>();

      if (Array.isArray(regStatsRaw) && regStatsRaw.length > 0) {
        for (const s of regStatsRaw) {
          const sRec = s as Record<string, unknown>;
          const key = toStr(
            sRec.mailroom_registration_id ?? sRec.id ?? sRec.registration_id,
          ).toLowerCase();
          if (!key) continue;
          const stored = Number(sRec.stored ?? 0);
          const pending = Number(sRec.pending ?? 0);
          const released = Number(sRec.released ?? 0);
          regMap.set(key, { stored, pending, released });
        }
      } else {
        // fallback: build counts from mailbox_item_table if RPC returned nothing
        const regIds = registrations
          .map((r) =>
            toStr(
              (r as Record<string, unknown>)?.mailroom_registration_id ??
                (r as Record<string, unknown>)?.id ??
                (r as Record<string, unknown>)?.registration_id ??
                "",
            ),
          )
          .filter(Boolean);
        if (regIds.length > 0) {
          const { data: itemsData, error: itemsErr } = await supabaseAdmin
            .from("mailbox_item_table")
            .select("mailroom_registration_id, mailbox_item_status");
          if (!itemsErr && Array.isArray(itemsData)) {
            for (const item of itemsData) {
              const idKey = toStr(item.mailroom_registration_id).toLowerCase();
              if (
                !idKey ||
                !regIds.includes(String(item.mailroom_registration_id))
              )
                continue;
              const status = toStr(item.mailbox_item_status).toUpperCase();
              const cur = regMap.get(idKey) ?? {
                stored: 0,
                pending: 0,
                released: 0,
              };
              if (status === "RELEASED") cur.released += 1;
              else if (status.includes("REQUEST")) cur.pending += 1;
              else if (!["RELEASED", "RETRIEVED", "DISPOSED"].includes(status))
                cur.stored += 1;
              regMap.set(idKey, cur);
            }
          } else {
            console.error("mailbox_item_table query error:", itemsErr);
          }
        }
      }

      registrations = (registrations as Record<string, unknown>[]).map((r) => {
        const idKey = toStr(
          r.mailroom_registration_id ?? r.id ?? r.registration_id ?? "",
        ).toLowerCase();
        const statsObj = regMap.get(idKey) ?? null;
        return {
          ...r,
          _stats: statsObj,
        };
      });

      return NextResponse.json(
        {
          data: registrations,
          meta: {
            total: registrations.length,
            page: 1,
            limit: registrations.length,
            stats: totals ?? null,
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "private, max-age=0, s-maxage=60, stale-while-revalidate=30",
          },
        },
      );
    } catch (e) {
      console.error("failed to fetch mailroom stats RPCs:", e);
      // fall back to returning registrations without stats
    }

    // fallback response (if stats RPCs failed)
    return NextResponse.json(
      {
        data: registrations,
        meta: {
          total: registrations.length,
          page: 1,
          limit: registrations.length,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, max-age=0, s-maxage=60, stale-while-revalidate=30",
        },
      },
    );
  } catch (err: unknown) {
    // Handle authentication errors with proper 401 response
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("registrations route unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
