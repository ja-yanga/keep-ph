import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { updateMailboxItem } from "@/app/actions/update";
import { getUserMailboxItem } from "@/app/actions/get";
import { headers } from "next/headers";

/**
 * Helper to generate CORS headers based on request origin
 */
async function getCorsHeaders() {
  const headerList = await headers();
  const origin = headerList.get("origin") || "*";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS, HEAD",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * OPTIONS /api/user/packages/[id]
 * Handles preflight and allowed methods discovery.
 */
export async function OPTIONS() {
  const corsHeaders = await getCorsHeaders();
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * GET /api/user/packages/[id]
 * Fetches single mailbox item details for the authenticated user.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const corsHeaders = await getCorsHeaders();
  try {
    const id = (await params).id;

    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: corsHeaders },
      );
    }

    // 2. Call server action / RPC
    const result = await getUserMailboxItem({
      package_id: id,
      user_id: user.id,
    });

    if (!result.ok) {
      const status = result.error === "Forbidden" ? 403 : 404;
      return NextResponse.json(
        { error: result.error },
        { status, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { ok: true, data: result.data },
      { headers: corsHeaders },
    );
  } catch (err: unknown) {
    console.error("user.packages.GET:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * PATCH /api/user/packages/[id]
 * Updates status or other fields for a mailbox item (e.g., Request to Scan).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const corsHeaders = await getCorsHeaders();
  try {
    const id = (await params).id;
    const body = (await request.json()) as Record<string, unknown>;

    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: corsHeaders },
      );
    }

    // 2. Call server action / RPC
    const result = await updateMailboxItem({
      userId: user.id,
      id,
      ...body,
    });

    if (!result.ok) {
      const statusMap: Record<string, number> = {
        "Mailbox item not found": 404,
        Forbidden: 403,
        "Invalid status": 400,
        "Address not found or unauthorized": 403,
      };
      const status = statusMap[result.error] || 500;
      return NextResponse.json(
        { error: result.error },
        { status, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { ok: true, mailbox_item: result.data },
      { headers: corsHeaders },
    );
  } catch (err: unknown) {
    console.error("user.packages.PATCH:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders },
    );
  }
}
