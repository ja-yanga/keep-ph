import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminReleaseMailroomPackage } from "@/app/actions/post";

export async function POST(request: Request) {
  try {
    // Authentication check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const packageIdRaw = formData.get("packageId") as string | null;
    const packageId = packageIdRaw?.trim() || null;
    const lockerStatus = formData.get("lockerStatus") as string | null;
    const notes = (formData.get("notes") as string) || null;
    const selectedAddressId =
      (formData.get("selectedAddressId") as string) || null;
    const releaseToName = (formData.get("release_to_name") as string) || null;

    // Validation
    if (!file || !packageId) {
      return NextResponse.json(
        {
          error: "Missing file or package ID",
          details: !file ? "File is required" : "Package ID is required",
        },
        { status: 400 },
      );
    }

    // Call action
    const result = await adminReleaseMailroomPackage({
      file,
      packageId,
      lockerStatus: lockerStatus || null,
      notes: notes || null,
      selectedAddressId: selectedAddressId || null,
      releaseToName: releaseToName || null,
      actorUserId: user.id,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Release error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Handle specific error messages
    if (errorMessage.includes("Package not found")) {
      return NextResponse.json(
        {
          error: "Package not found",
          details: errorMessage,
        },
        { status: 404 },
      );
    }

    if (
      errorMessage.includes("Selected address not found") ||
      errorMessage.includes("Address does not belong")
    ) {
      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
