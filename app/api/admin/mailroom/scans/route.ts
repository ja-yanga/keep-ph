import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications"; // Import the helper

// Initialize Admin Client (Service Role needed for Storage uploads if RLS is strict)
const supabase = createSupabaseServiceClient();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const packageId = formData.get("packageId") as string;

    if (!file || !packageId) {
      return NextResponse.json(
        { error: "File and Package ID are required" },
        { status: 400 },
      );
    }

    // 1. Upload File to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${packageId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("mailroom-scans") // Ensure this bucket exists in Supabase
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 2. Get Public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("mailroom-scans").getPublicUrl(filePath);

    // 3. Insert Record into mailroom_scans
    const fileSizeMb = file.size / (1024 * 1024); // Convert bytes to MB

    const { error: dbError } = await supabase.from("mailroom_scans").insert({
      package_id: packageId,
      file_name: file.name,
      file_url: publicUrl,
      file_size_mb: fileSizeMb,
      mime_type: file.type,
    });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // 4. Update Package Status (Reset to STORED or mark as PROCESSED)
    // We reset to 'STORED' so the "Request" badge disappears, but the file is now linked.
    const { data: pkgData, error: updateError } = await supabase
      .from("mailroom_packages")
      .update({ status: "STORED" })
      .eq("id", packageId)
      // tracking_number was removed; use package_name instead
      .select("registration_id, package_name")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 5. Fetch registration to get user_id and mailroom_code
    const { data: registration } = await supabase
      .from("mailroom_registrations")
      .select("user_id, mailroom_code")
      .eq("id", pkgData.registration_id)
      .single();

    // 6. Send Notification
    if (registration?.user_id) {
      try {
        const label = pkgData?.package_name ?? "Unknown";
        await sendNotification(
          registration.user_id,
          "Document Scanned",
          `Your document (${label}) has been scanned and is ready to view.`,
          "SCAN_READY",
          `/mailroom/${pkgData.registration_id}`,
        );
      } catch (notifyErr) {
        console.error("sendNotification failed:", notifyErr);
      }
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: unknown) {
    console.error("Scan upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
