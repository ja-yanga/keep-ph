import { NextResponse } from "next/server";
import { adminGetAssignedLockers } from "@/app/actions/get";
import { adminCreateAssignedLocker } from "@/app/actions/post";

export async function GET() {
  try {
    const data = await adminGetAssignedLockers();
    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const registrationId = String(body.registration_id ?? "");
    const lockerId = String(body.locker_id ?? "");

    if (!registrationId || !lockerId) {
      return NextResponse.json(
        { error: "registration_id and locker_id are required" },
        { status: 400 },
      );
    }

    const data = await adminCreateAssignedLocker({
      registration_id: registrationId,
      locker_id: lockerId,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    const status = errorMessage.includes("available") ? 409 : 500;

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
