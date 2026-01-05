import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { updateMailboxItem } from "@/app/actions/update";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    const body = (await request.json()) as Record<string, unknown>;

    // Authenticate user via cookie
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const data = await updateMailboxItem({
      userId: user.id,
      id,
      ...body,
    });

    return NextResponse.json({ ok: true, mailbox_item: data });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";

    const statusMap: Record<string, number> = {
      "Mailbox item not found": 404,
      Forbidden: 403,
      "Invalid status": 400,
      "Address not found or unauthorized": 403,
    };

    const status = statusMap[errorMessage] || 500;

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
