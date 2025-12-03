import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { id } = await params; // Await params for Next.js 15 compatibility

    // 1. SEPARATE locker_status from the package data
    // This prevents the "column does not exist" error
    const { locker_status, ...packageData } = body;

    // 2. Get the OLD status first to compare
    const { data: oldPkg } = await supabaseAdmin
      .from("mailroom_packages")
      .select("status, registration_id")
      .eq("id", id)
      .single();

    // 3. Update the package (using packageData ONLY)
    const { data: updatedPkg, error } = await supabaseAdmin
      .from("mailroom_packages")
      .update(packageData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 4. UPDATE LOCKER STATUS (if provided)
    if (locker_status && oldPkg?.registration_id) {
      // Find the assignment for this registration
      const { data: assignment } = await supabaseAdmin
        .from("mailroom_assigned_lockers")
        .select("id")
        .eq("registration_id", oldPkg.registration_id)
        .single();

      if (assignment) {
        await supabaseAdmin
          .from("mailroom_assigned_lockers")
          .update({ status: locker_status })
          .eq("id", assignment.id);
      }
    }

    // 5. SEND NOTIFICATION if status changed
    if (oldPkg && packageData.status && oldPkg.status !== packageData.status) {
      // Fetch user details
      const { data: registration } = await supabaseAdmin
        .from("mailroom_registrations")
        // CHANGED: Added mailroom_code to select
        .select("user_id, mailroom_code")
        .eq("id", oldPkg.registration_id)
        .single();

      if (registration?.user_id) {
        const code = registration.mailroom_code || "Unknown";
        let title = "Package Update";
        // CHANGED: Added Mailroom Code to messages
        let message = `Your package (${updatedPkg.tracking_number}) at Mailroom ${code} status is now: ${packageData.status}`;
        let type: any = "SYSTEM";

        // Customize message based on status
        if (packageData.status === "RELEASED") {
          title = "Package Released";
          message = `Package (${updatedPkg.tracking_number}) from Mailroom ${code} has been picked up/released.`;
          type = "PACKAGE_RELEASED";
        } else if (packageData.status === "DISPOSED") {
          title = "Package Disposed";
          message = `Package (${updatedPkg.tracking_number}) from Mailroom ${code} has been disposed.`;
          type = "PACKAGE_DISPOSED";
        }

        await sendNotification(
          registration.user_id,
          title,
          message,
          type,
          `/mailroom/${oldPkg.registration_id}` // CHANGED: Link to specific mailroom
        );
      }
    }

    return NextResponse.json(updatedPkg);
  } catch (error: any) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const { error } = await supabaseAdmin
    .from("mailroom_packages")
    .delete()
    .eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
