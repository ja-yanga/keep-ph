import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminGetMailroomPackages } from "@/app/actions/get";
import { adminCreateMailroomPackage } from "@/app/actions/post";
import { logApiError } from "@/lib/error-log";
import type { AdminCreateMailroomPackageArgs } from "@/utils/types";

export async function GET(req?: Request) {
  try {
    const url = req ? new URL(req.url) : new URL("");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const offset = (page - 1) * limit;
    const compact = url.searchParams.get("compact") === "1";
    const status = url.searchParams.get("status")?.split(",") ?? undefined;
    const sortBy = url.searchParams.get("sortBy") ?? "received_at";
    const sortOrder = url.searchParams.get("sortOrder") ?? "desc";
    const search = url.searchParams.get("search") ?? undefined;
    const type = url.searchParams.get("type") ?? undefined;

    const result = await adminGetMailroomPackages({
      limit,
      offset,
      compact,
      status,
      sortBy,
      sortOrder,
      search,
      type,
    });

    return NextResponse.json(
      {
        packages: result.packages,
        registrations: result.registrations,
        lockers: result.lockers,
        assignedLockers: result.assignedLockers,
        counts: result.counts,
        meta: {
          total: result.totalCount,
          page,
          limit,
        },
      },
      {
        headers: {
          "Cache-Control":
            "private, max-age=60, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err: unknown) {
    console.error("packages GET error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Omit<
      AdminCreateMailroomPackageArgs,
      "userId"
    >;

    // Require package_name
    const packageName = body.mailbox_item_name ?? null;
    if (!packageName) {
      void logApiError(request, {
        status: 400,
        message: "package_name is required",
      });
      return NextResponse.json(
        { error: "package_name is required" },
        { status: 400 },
      );
    }

    const data = await adminCreateMailroomPackage({
      userId: user.id,
      mailbox_item_name: packageName,
      mailroom_registration_id: body.mailroom_registration_id,
      location_locker_id: body.location_locker_id || null,
      mailroom_item_type: body.mailroom_item_type,
      mailroom_item_status: body.mailroom_item_status,
      mailbox_item_notes: body.mailbox_item_notes,
      mailbox_item_photo: body.mailbox_item_photo ?? null,
      location_locker_status: body.location_locker_status,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    void logApiError(request, {
      status: 500,
      message: errorMessage,
      error,
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
