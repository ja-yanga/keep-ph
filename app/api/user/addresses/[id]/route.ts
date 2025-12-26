import { NextResponse } from "next/server";
import { deleteUserAddress, updateUserAddress } from "@/app/actions/post";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { label, line1, line2, city, region, postal, is_default } = body;

    if (!line1) {
      return NextResponse.json({ error: "line1 required" }, { status: 400 });
    }

    const address = await updateUserAddress({
      address_id: id,
      label,
      line1,
      line2,
      city,
      region,
      postal,
      is_default,
    });

    return NextResponse.json({ ok: true, address });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ok = await deleteUserAddress(id);
    if (!ok) {
      return NextResponse.json(
        { error: "Not found or already removed" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
