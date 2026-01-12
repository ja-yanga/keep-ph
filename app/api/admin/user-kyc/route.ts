import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminListUserKyc, getUserRole } from "@/app/actions/get";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // verify requester is admin
    const requesterRole = await getUserRole(user.id);
    if (requesterRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // support ?q=search, ?page=1, ?pageSize=10
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const pageSize = Math.max(
      1,
      Number(url.searchParams.get("pageSize") ?? "10"),
    );
    const offset = (page - 1) * pageSize;
    const status = url.searchParams.get("status");
    const { data: raw, total_count } = await adminListUserKyc(
      q,
      pageSize,
      offset,
      status ?? undefined,
    );

    const processed = raw.map((row) => {
      const firstName = row.user_kyc_first_name ?? "";
      const lastName = row.user_kyc_last_name ?? "";
      const fullName = `${firstName} ${lastName}`.trim();

      return {
        id: row.user_kyc_id,
        user_id: row.user_id,
        status: row.user_kyc_status ?? "SUBMITTED",
        id_document_type: row.user_kyc_id_document_type,
        id_number: row.user_kyc_id_number,
        id_front_url: row.user_kyc_id_front_url,
        id_back_url: row.user_kyc_id_back_url,
        first_name: row.user_kyc_first_name,
        last_name: row.user_kyc_last_name,
        full_name: fullName || null,
        address: row.address
          ? {
              line1: row.address.line1 ?? undefined,
              line2: row.address.line2 ?? undefined,
              city: row.address.city ?? undefined,
              region: row.address.region ?? undefined,
              postal: row.address.postal
                ? String(row.address.postal)
                : undefined,
            }
          : null,
        submitted_at: row.user_kyc_submitted_at,
        verified_at: row.user_kyc_verified_at,
        created_at: row.user_kyc_created_at,
        updated_at: row.user_kyc_updated_at,
      };
    });

    return NextResponse.json(
      { data: processed, total_count },
      {
        headers: {
          "Cache-Control": "no-cache, must-revalidate",
        },
      },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("admin KYC list error:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
