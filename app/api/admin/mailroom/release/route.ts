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
    const file = formData.get("file") as File | null;
    const packageId = formData.get("packageId") as string | null;
    const lockerStatus = formData.get("lockerStatus") as string | null;
    const notes = (formData.get("notes") as string) || null;
    const selectedAddressId =
      (formData.get("selectedAddressId") as string) || null;

    if (!file || !packageId) {
      return NextResponse.json(
        { error: "Missing file or package ID" },
        { status: 400 }
      );
    }

    // Fetch package early to get registration_id for address validation & notification
    const { data: pkgRow, error: pkgRowErr } = await supabaseAdmin
      .from("mailroom_packages")
      .select("id, registration_id, package_name")
      .eq("id", packageId)
      .single();

    if (pkgRowErr || !pkgRow) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Lookup registration to get the owning user_id
    const { data: registrationRow, error: registrationErr } =
      await supabaseAdmin
        .from("mailroom_registrations")
        .select("id, user_id, full_name, mobile")
        .eq("id", pkgRow.registration_id)
        .single();

    if (registrationErr || !registrationRow) {
      console.warn(
        "[release] registration not found for package",
        pkgRow.id,
        pkgRow.registration_id
      );
    }

    // If selectedAddressId was provided, validate ownership and prepare snapshot fields
    let releaseAddressId: string | null = null;
    let releaseAddressText: string | null = null;
    let releaseToName: string | null = null;

    if (selectedAddressId) {
      console.debug("[release] selectedAddressId:", selectedAddressId);
      const { data: addr, error: addrErr } = await supabaseAdmin
        .from("user_addresses")
        .select(
          "id, user_id, label, contact_name, line1, line2, city, region, postal, is_default"
        )
        .eq("id", selectedAddressId)
        .single();

      console.debug("[release] address query result:", { addr, addrErr });

      if (addrErr || !addr) {
        return NextResponse.json(
          { error: "Selected address not found" },
          { status: 400 }
        );
      }

      // Ensure address belongs to the registration's user
      const ownerUserId = registrationRow?.user_id ?? null;
      if (ownerUserId && String(addr.user_id) !== String(ownerUserId)) {
        return NextResponse.json(
          { error: "Address does not belong to this registration's user" },
          { status: 403 }
        );
      }

      releaseAddressId = addr.id;
      releaseToName = addr.contact_name ?? null;
      releaseAddressText = [
        addr.label ?? "",
        addr.line1 ?? "",
        addr.line2 ?? "",
        addr.city ?? "",
        addr.region ?? "",
        addr.postal ?? "",
      ]
        .filter(Boolean)
        .join(", ");
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

    // 2. Update Package Status and snapshot release address/name if provided
    const updatePayload: any = {
      status: "RELEASED",
      image_url: publicUrl,
      mailroom_full: false,
    };

    if (notes) updatePayload.notes = notes;
    if (releaseAddressId) {
      updatePayload.release_address_id = releaseAddressId;
      updatePayload.release_address = releaseAddressText;
    }
    if (releaseToName) updatePayload.release_to_name = releaseToName;

    const { data: pkg, error: updateError } = await supabaseAdmin
      .from("mailroom_packages")
      .update(updatePayload)
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
                pkg.package_name || "Unknown"
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
