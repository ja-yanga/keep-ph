import { NextResponse } from "next/server";
import { updateMailroomAssignedLockerStatus } from "@/app/actions/update";
import { deleteMailroomAssignedLocker } from "@/app/actions/delete";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await request
      .json()
      .catch(() => ({}) as Record<string, unknown>);
    const status = String(body.status ?? "").trim();

    const validStatuses = ["Empty", "Normal", "Near Full", "Full"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await updateMailroomAssignedLockerStatus({ id, status });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await deleteMailroomAssignedLocker(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
