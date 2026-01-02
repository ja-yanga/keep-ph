import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications";
import { T_NotificationType } from "@/utils/types";

const supabaseAdmin = createSupabaseServiceClient();

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = await req.json();
    const { id } = await params; // Await params for Next.js 15 compatibility

    // FETCH existing package so oldPkg is defined for later comparisons
    const { data: oldPkg, error: fetchError } = await supabaseAdmin
      .from("mailroom_packages")
      .select()
      .eq("id", id)
      .single();
    if (fetchError) {
      console.warn(
        "Failed to fetch existing package:",
        fetchError.message || fetchError,
      );
    }

    // 1. SEPARATE locker_status from the package data
    const { locker_status, ...packageData } = body;

    // Build update payload explicitly to control package_photo updates
    const updatePayload: Record<string, unknown> = { ...packageData };
    if (Object.prototype.hasOwnProperty.call(body, "package_photo")) {
      // allow clearing by sending null, or set URL when provided
      updatePayload.package_photo = body.package_photo;
    }

    // 3. Update the package (using updatePayload ONLY)
    // return the updated row with joined registration (and its plan) and locker
    const { data: updatedPkg, error } = await supabaseAdmin
      .from("mailroom_packages")
      .update(updatePayload)
      .eq("id", id)
      .select(
        "*, registration:mailroom_registrations(id, full_name, email, mobile, mailroom_code, mailroom_plans:mailroom_plans(name, can_receive_mail, can_receive_parcels)), locker:location_lockers(id, locker_code)",
      )
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
        let message = `Your package (${updatedPkg.package_name}) at Mailroom ${code} status is now: ${packageData.status}`;
        let type: T_NotificationType = "SYSTEM";

        // Customize message based on status
        if (packageData.status === "RELEASED") {
          title = "Package Released";
          message = `Package (${updatedPkg.package_name}) from Mailroom ${code} has been picked up/released.`;
          type = "PACKAGE_RELEASED";
        } else if (packageData.status === "DISPOSED") {
          title = "Package Disposed";
          message = `Package (${updatedPkg.package_name}) from Mailroom ${code} has been disposed.`;
          type = "PACKAGE_DISPOSED";
        }

        await sendNotification(
          registration.user_id,
          title,
          message,
          type,
          `/mailroom/${oldPkg.registration_id}`, // CHANGED: Link to specific mailroom
        );
      }
    }

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
  const id = (await params).id;
  const { error } = await supabaseAdmin
    .from("mailroom_packages")
    .delete()
    .eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
