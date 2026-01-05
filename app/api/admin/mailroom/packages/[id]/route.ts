import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminUpdateMailroomPackage } from "@/app/actions/update";
import { adminDeleteMailroomPackage } from "@/app/actions/delete";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = await params;

    const updatedPkg = await adminUpdateMailroomPackage({
      userId: user.id,
      id,
      ...body,
    });

    return NextResponse.json(updatedPkg);
  } catch (error: unknown) {
    console.error("PUT Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const result = await adminDeleteMailroomPackage({
      userId: user.id,
      id,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
