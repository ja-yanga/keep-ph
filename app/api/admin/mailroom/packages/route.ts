import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminGetMailroomPackages } from "@/app/actions/get";
import { adminCreateMailroomPackage } from "@/app/actions/post";

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

    const body = await request.json();

    // Require package_name
    const packageName = body.package_name ?? null;
    if (!packageName) {
      return NextResponse.json(
        { error: "package_name is required" },
        { status: 400 },
      );
    }

    const data = await adminCreateMailroomPackage({
      userId: user.id,
      package_name: packageName,
      registration_id: body.registration_id,
      locker_id: body.locker_id || null,
      package_type: body.package_type,
      status: body.status,
      notes: body.notes,
      package_photo: body.package_photo ?? null,
      locker_status: body.locker_status,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
