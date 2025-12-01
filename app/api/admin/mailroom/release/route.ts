import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Initialize Admin Client
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const packageId = formData.get("packageId") as string;

    if (!file || !packageId) {
      return NextResponse.json(
        { error: "File and Package ID are required" },
        { status: 400 }
      );
    }

    // 1. Fetch Package to get Registration ID
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("mailroom_packages")
      .select("registration_id, tracking_number")
      .eq("id", packageId)
      .single();

    if (pkgError || !pkg) {
      console.error("Package fetch error:", pkgError);
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // 2. Prepare File for Upload (Convert to Buffer)
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const fileExt = file.name.split(".").pop();
    const fileName = `${pkg.registration_id}/${
      pkg.tracking_number
    }_proof_${Date.now()}.${fileExt}`;

    // 3. Upload to Supabase
    const { error: uploadError } = await supabaseAdmin.storage
      .from("mailroom-proofs")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage Upload Error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 4. Get Public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("mailroom-proofs").getPublicUrl(fileName);

    // 5. Update Package Status
    const { error: updateError } = await supabaseAdmin
      .from("mailroom_packages")
      .update({
        status: "RELEASED", // Changed from "completed" to "RELEASED"
        release_proof_url: publicUrl,
      })
      .eq("id", packageId);

    if (updateError) {
      console.error("Package update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update package status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "File uploaded and package updated" });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
