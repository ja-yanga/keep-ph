import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/error-log";
import { LockerRow } from "@/utils/types";

const supabase = createSupabaseServiceClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.max(
      1,
      Math.min(100, Number(searchParams.get("pageSize") ?? 10)),
    );
    const search = searchParams.get("search")?.trim() || "";
    const locationId = searchParams.get("locationId")?.trim() || "";
    const activeTab = searchParams.get("activeTab") || "all";

    const offset = (page - 1) * pageSize;

    // Start building the query
    let query = supabase
      .from("location_locker_table")
      .select(
        "location_locker_id, mailroom_location_id, location_locker_code, location_locker_is_available, location_locker_created_at, mailroom_location_table(mailroom_location_id, mailroom_location_name)",
        { count: "exact" },
      )
      .is("location_locker_deleted_at", null)
      .order("location_locker_created_at", { ascending: false });

    // Apply Search
    if (search) {
      query = query.ilike("location_locker_code", `%${search}%`);
    }

    // Apply Location Filter
    if (locationId) {
      query = query.eq("mailroom_location_id", locationId);
    }

    // Apply Status Filter (Occupied vs Available)
    if (activeTab === "occupied") {
      query = query.eq("location_locker_is_available", false);
    } else if (activeTab === "available") {
      query = query.eq("location_locker_is_available", true);
    }

    // Apply Pagination
    const {
      data: lockersData,
      error: lockersErr,
      count,
    } = await query.range(offset, offset + pageSize - 1);

    if (lockersErr) {
      return NextResponse.json(
        { error: (lockersErr as Error).message },
        { status: 500 },
      );
    }

    const lockerRows = Array.isArray(lockersData)
      ? (lockersData as LockerRow[])
      : [];

    // Collect IDs for separate assignment fetch
    const lockerIds = lockerRows.map((r) => r.location_locker_id);

    // fetch current assignments separately and build map by locker id
    // Only fetch for the lockers on the current page
    const assignedMap = new Map<string, Record<string, unknown>>();

    if (lockerIds.length > 0) {
      const { data: assignedData } = await supabase
        .from("mailroom_assigned_locker_table")
        .select(
          "mailroom_assigned_locker_id, location_locker_id, mailroom_registration_id, mailroom_assigned_locker_status",
        )
        .in("location_locker_id", lockerIds);

      const assignedRows = Array.isArray(assignedData)
        ? (assignedData as Record<string, unknown>[])
        : [];

      for (const a of assignedRows) {
        const lid = String(a.location_locker_id ?? "");
        if (lid) {
          // keep the latest if multiple (shouldn't happen due to UNIQUE constraint)
          assignedMap.set(lid, a);
        }
      }
    }

    const normalized = lockerRows.map((r) => {
      const locTable = r.mailroom_location_table;
      const assigned = assignedMap.get(r.location_locker_id ?? "") ?? null;
      const isAvailable = r.location_locker_is_available ?? true;
      // consider assigned existence first; fallback to is_available flag
      const isAssigned = Boolean(assigned) || isAvailable === false;

      return {
        id: r.location_locker_id,
        location_id: r.mailroom_location_id ?? null,
        locker_code: r.location_locker_code ?? null,
        is_available: isAvailable,
        created_at: r.location_locker_created_at ?? null,
        location: locTable
          ? {
              id: locTable.mailroom_location_id ?? null,
              name: locTable.mailroom_location_name ?? null,
            }
          : null,
        assigned: assigned
          ? {
              id: assigned.mailroom_assigned_locker_id ?? null,
              registration_id: assigned.mailroom_registration_id ?? null,
              status: assigned.mailroom_assigned_locker_status ?? null,
            }
          : null,
        is_assigned: isAssigned,
      };
    });

    return NextResponse.json(
      {
        data: normalized,
        pagination: {
          page,
          pageSize,
          totalCount: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / pageSize),
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, max-age=60, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err: unknown) {
    console.error("admin.mailroom.lockers.GET:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      void logApiError(req, { status: 400, message: "Invalid JSON body" });
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const locationId = String(body.location_id ?? "").trim();
    const lockerCode = String(body.locker_code ?? "").trim();
    const isAvailable =
      body.is_available == null ? true : Boolean(body.is_available);

    if (!locationId || !lockerCode) {
      return NextResponse.json(
        { error: "location_id and locker_code are required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("location_locker_table")
      .insert([
        {
          mailroom_location_id: locationId,
          location_locker_code: lockerCode,
          location_locker_is_available: isAvailable,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      const msg = (error as Error)?.message || "Failed to create locker";
      void logApiError(req, { status: 500, message: msg, error });
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // increment total_lockers on location (best-effort)
    const { data: locData, error: locErr } = await supabase
      .from("mailroom_location_table")
      .select("mailroom_location_total_lockers")
      .eq("mailroom_location_id", locationId)
      .maybeSingle();

    if (!locErr && locData) {
      const cur =
        (locData as { mailroom_location_total_lockers?: number })
          .mailroom_location_total_lockers ?? 0;
      await supabase
        .from("mailroom_location_table")
        .update({ mailroom_location_total_lockers: cur + 1 })
        .eq("mailroom_location_id", locationId);
    }

    const created = data as {
      location_locker_id: string;
      location_locker_code?: string | null;
    };

    return NextResponse.json(
      {
        data: {
          id: created.location_locker_id,
          code: created.location_locker_code ?? null,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    void logApiError(req, {
      status: 500,
      message: "Internal Server Error",
      error: err,
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
