//TODO: CONVERT TO SERVER ACTION (RPC)

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";

const supabaseAdmin = createSupabaseBrowserClient();

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // verify requester is admin
    const { data: requester, error: requesterErr } = await supabaseAdmin
      .from("users_table")
      .select("users_role")
      .eq("users_id", user.id)
      .maybeSingle();
    if (requesterErr) throw requesterErr;
    if (!requester || requester.users_role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // optional: support ?q=search and ?limit
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const limit = Number(url.searchParams.get("limit") ?? "500");

    const builder = supabaseAdmin
      .from("user_kyc_table")
      .select(
        [
          "user_kyc_id",
          "user_id",
          "user_kyc_status",
          "user_kyc_id_document_type",
          "user_kyc_id_front_url",
          "user_kyc_id_back_url",
          "user_kyc_first_name",
          "user_kyc_last_name",
          "user_kyc_submitted_at",
          "user_kyc_verified_at",
          "user_kyc_created_at",
          "user_kyc_updated_at",
          "user_kyc_address_table(user_kyc_address_line_one, user_kyc_address_line_two, user_kyc_address_city, user_kyc_address_region, user_kyc_address_postal_code)",
        ].join(","),
      )
      .order("user_kyc_submitted_at", { ascending: false })
      .limit(limit);

    if (q) {
      // simple ilike search against first and last name
      builder.or(
        `user_kyc_first_name.ilike.%${q}%,user_kyc_last_name.ilike.%${q}%`,
      );
    }

    const { data, error } = await builder;
    if (error) throw error;

    const processed = data
      ? (data as unknown as Record<string, unknown>[]).map(
          (row: Record<string, unknown>) => {
            const {
              user_kyc_id: id,
              user_id,
              user_kyc_status: status,
              user_kyc_id_document_type: id_document_type,
              user_kyc_id_front_url: id_front_url,
              user_kyc_id_back_url: id_back_url,
              user_kyc_first_name: first_name,
              user_kyc_last_name: last_name,
              user_kyc_submitted_at: submitted_at,
              user_kyc_verified_at: verified_at,
              user_kyc_created_at: created_at,
              user_kyc_updated_at: updated_at,
              user_kyc_address_table: addressTable,
            } = row as Record<string, unknown>;
            const address = (
              addressTable as Array<Record<string, unknown>>
            )?.[0]
              ? {
                  line1: (addressTable as Array<Record<string, unknown>>)[0]
                    .user_kyc_address_line_one as string | undefined,
                  line2: (addressTable as Array<Record<string, unknown>>)[0]
                    .user_kyc_address_line_two as string | undefined,
                  city: (addressTable as Array<Record<string, unknown>>)[0]
                    .user_kyc_address_city as string | undefined,
                  region: (addressTable as Array<Record<string, unknown>>)[0]
                    .user_kyc_address_region as string | undefined,
                  postal: (addressTable as Array<Record<string, unknown>>)[0]
                    .user_kyc_address_postal_code as string | undefined,
                }
              : null;
            return {
              id,
              user_id,
              status,
              id_document_type,
              id_front_url,
              id_back_url,
              first_name,
              last_name,
              submitted_at,
              verified_at,
              created_at,
              updated_at,
              address,
            };
          },
        )
      : [];

    return NextResponse.json({ data: processed });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("admin KYC list error:", err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
