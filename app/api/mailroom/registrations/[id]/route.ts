import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    const { data: registration, error: regError } = await supabase
      .from("mailroom_registration_table")
      .select(
        `
        mailroom_registration_id,
        user_id,
        mailroom_location_id,
        mailroom_plan_id,
        mailroom_registration_code,
        mailroom_registration_status,
        mailroom_registration_created_at,
        mailroom_registration_updated_at,
        mailroom_location_table (
          mailroom_location_id,
          mailroom_location_name,
          mailroom_location_city,
          mailroom_location_region,
          mailroom_location_barangay,
          mailroom_location_zip
        ),
        mailroom_plan_table (
          mailroom_plan_id,
          mailroom_plan_name,
          mailroom_plan_price,
          mailroom_plan_can_digitize,
          mailroom_plan_can_receive_mail,
          mailroom_plan_can_receive_parcels
        ),
        mailbox_item_table (
          mailbox_item_id,
          mailbox_item_status,
          location_locker_id,
          mailbox_item_received_at,
          mailbox_item_created_at,
          mailbox_item_updated_at,
          mailbox_item_name,
          mailbox_item_photo,
          location_locker_table ( * ),
          mailroom_file_table (
            mailroom_file_id,
            mailroom_file_name,
            mailroom_file_url,
            mailroom_file_size_mb,
            mailroom_file_mime_type,
            mailroom_file_uploaded_at,
            mailroom_file_type
          )
        ),
        subscription_table (
          subscription_id,
          subscription_expires_at,
          subscription_auto_renew,
          subscription_started_at
        ),
        users_table (
          users_id,
          users_email,
          users_avatar_url,
          mobile_number,
          user_kyc_table (
            user_kyc_first_name,
            user_kyc_last_name,
            user_kyc_status
          )
        )
      `,
      )
      .eq("mailroom_registration_id", id)
      .single();

    if (regError) {
      console.error("registration fetch error:", regError);
      return NextResponse.json(
        { error: regError.message ?? "Registration not found" },
        { status: 404 },
      );
    }

    const { data: assignedLockers, error: lockerErr } = await supabase
      .from("mailroom_assigned_locker_table")
      .select("*, location_locker_table ( * )")
      .eq("mailroom_registration_id", id);

    if (lockerErr) {
      console.error("assigned lockers fetch error:", lockerErr);
    }

    const lockers =
      Array.isArray(assignedLockers) && assignedLockers.length > 0
        ? assignedLockers
            .map((a) => {
              const loc = (a as Record<string, unknown>)[
                "location_locker_table"
              ] as Record<string, unknown> | null;
              if (!loc) return null;
              return {
                ...loc,
                status:
                  (a as Record<string, unknown>)[
                    "mailroom_assigned_locker_status"
                  ] ?? "Normal",
              };
            })
            .filter(Boolean)
        : [];

    const reg = (registration as Record<string, unknown>) ?? {};
    const usersTable =
      (reg.users_table as Record<string, unknown> | undefined) ?? null;
    const subscription =
      (reg.subscription_table as Record<string, unknown> | undefined) ?? null;
    const plan =
      (reg.mailroom_plan_table as Record<string, unknown> | undefined) ?? null;
    const mailboxItems = (reg.mailbox_item_table as unknown) ?? null;
    const locationTable = (reg.mailroom_location_table as unknown) ?? null;

    const normalized = {
      id: (reg.mailroom_registration_id as string) ?? (reg.id as string) ?? id,
      user_id: (reg.user_id as string) ?? null,
      mailroom_code:
        (reg.mailroom_registration_code as string) ??
        (reg.mailroom_code as string) ??
        null,
      created_at:
        (reg.mailroom_registration_created_at as string) ??
        (reg.created_at as string) ??
        null,
      months: plan?.mailroom_plan_price ?? null,
      mailroom_plan_table: plan ?? null,
      subscription_table: subscription ?? null,
      expiry_at:
        subscription?.subscription_expires_at ??
        (reg.expiry_at as string) ??
        null,
      mailroom_location_table: locationTable ?? null,
      mailbox_item_table: Array.isArray(mailboxItems)
        ? mailboxItems
        : (mailboxItems ?? null),
      users: usersTable ?? null,
      users_table: usersTable ?? null,
      lockers,
      raw: reg,
    };

    return NextResponse.json(
      { data: normalized },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, max-age=0, s-maxage=60, stale-while-revalidate=30",
        },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("registrations/[id] unexpected error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
