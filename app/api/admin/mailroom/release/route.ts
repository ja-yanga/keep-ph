import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const packageId = formData.get("packageId") as string;
    const lockerStatus = formData.get("lockerStatus") as string;

    if (!file || !packageId) {
      return NextResponse.json(
        { error: "Missing file or package ID" },
        { status: 400 }
      );
    }

    const BUCKET_NAME = "mailroom_proofs";

    // 0. Ensure bucket exists (Fix for Bucket not found)
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
      console.log(`Bucket ${BUCKET_NAME} not found, creating...`);
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg"],
      });
    }

    // 1. Upload File
    const fileExt = file.name.split(".").pop();
    const fileName = `proof-${packageId}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(fileName);

    // 2. Update Package Status
    const { data: pkg, error: updateError } = await supabaseAdmin
      .from("mailroom_packages")
      .update({
        status: "RELEASED",
        image_url: publicUrl,
        mailroom_full: false,
      })
      .eq("id", packageId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Update Locker Status
    if (lockerStatus && pkg.registration_id) {
      const { error: lockerError } = await supabaseAdmin
        .from("mailroom_assigned_lockers")
        .update({ status: lockerStatus })
        .eq("registration_id", pkg.registration_id);

      if (lockerError)
        console.error("Failed to update locker status:", lockerError);
    }

    // 4. Notify user (same pattern as scans route)
    if (pkg?.registration_id) {
      try {
        const { data: registration, error: regErr } = await supabaseAdmin
          .from("mailroom_registrations")
          .select("user_id, mailroom_code")
          .eq("id", pkg.registration_id)
          .single();

        if (regErr) {
          console.error(
            "Failed to fetch registration for notification:",
            regErr
          );
        } else if (registration?.user_id) {
          try {
            await sendNotification(
              registration.user_id,
              "Package Released",
              `Your package (${
                pkg.tracking_number || "Unknown"
              }) has been released and is ready for pickup.`,
              "PACKAGE_RELEASED",
              `/mailroom/${pkg.registration_id}`
            );
          } catch (notifyErr) {
            console.error("sendNotification failed for release:", notifyErr);
          }
        }
      } catch (e) {
        console.error("Notification flow failed:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Release error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
