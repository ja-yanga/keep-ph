import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  createClient,
} from "@/lib/supabase/server";
import { adminUpdateMailroomPackage } from "@/app/actions/update";
import { logActivity } from "@/lib/activity-log";

const supabaseAdmin = createSupabaseServiceClient();

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

    const { locker_status, ...packageData } = body;

    const updatedPkg = await adminUpdateMailroomPackage({
      userId: user.id,
      id,
      package_name: packageData.package_name,
      registration_id: packageData.registration_id,
      locker_id: packageData.locker_id,
      package_type: packageData.package_type,
      status: packageData.status,
      package_photo: body.package_photo,
      locker_status: locker_status,
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

    // Fetch package before soft delete for activity log
    const { data: packageData } = await supabaseAdmin
      .from("mailbox_item_table")
      .select("mailbox_item_id, mailbox_item_name, mailroom_registration_id")
      .eq("mailbox_item_id", id)
      .single();

    // Soft delete: set deleted_at timestamp
    const { error } = await supabaseAdmin
      .from("mailbox_item_table")
      .update({ mailbox_item_deleted_at: new Date().toISOString() })
      .eq("mailbox_item_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    if (packageData) {
      const pkg = packageData as Record<string, unknown>;
      await logActivity({
        userId: user.id,
        action: "DELETE",
        type: "ADMIN_ACTION",
        entityType: "MAILBOX_ITEM",
        entityId: id,
        details: {
          mailbox_item_id: id,
          package_name: pkg.mailbox_item_name,
          registration_id: pkg.mailroom_registration_id,
          deleted_at: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
