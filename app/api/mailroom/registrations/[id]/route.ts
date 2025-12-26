import { getAuthenticatedUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    // This helper automatically handles session refresh and picks up
    // the Authorization: Bearer token from headers OR cookies via createClient().
    // Passing isAPI=true throws an error (instead of redirecting) for proper API responses.
    const { user, supabase } = await getAuthenticatedUser(true);

    // 1. Fetch Registration with relations
    // Using the user's supabase client ensures RLS is applied.
    // Assuming the table name is 'mailroom_registration_table' based on the plural route.
    const { data: registration, error } = await supabase
      .from("mailroom_registration_table")
      .select(
        `
        *,
        mailroom_plan_table (*),
        mailroom_location_table (*),
        users_table (*, user_kyc_table (*)),
        mailbox_item_table (*)
      `,
      )
      .eq("mailroom_registration_id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Registration fetch error:", error);
      return NextResponse.json(
        { error: "Registration not found or unauthorized" },
        { status: 404 },
      );
    }

    // 2. Fetch Assigned Lockers
    // We might need the service role client if RLS is too restrictive for this join,
    // but better to keep it secure first.
    const { data: assignedLockers } = await supabase
      .from("mailroom_assigned_locker_table")
      .select(
        `
        *,
        location_locker_table (*)
      `,
      )
      .eq("mailroom_registration_id", id);

    // 3. Format the response
    const lockers =
      assignedLockers
        ?.map((a) => {
          const locker = a.location_locker_table;
          if (!locker) return null;
          return {
            ...(locker as Record<string, unknown>),
            status: (a as Record<string, unknown>)
              .mailroom_assigned_locker_status,
          };
        })
        .filter(Boolean) || [];

    const reg = (registration as Record<string, unknown>) ?? {};
    const usersTable =
      (reg.users_table as Record<string, unknown> | undefined) ?? null;
    const userKycTable = Array.isArray(usersTable?.user_kyc_table)
      ? usersTable?.user_kyc_table[0]
      : (usersTable?.user_kyc_table ?? null);

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
      user_kyc_table: userKycTable ?? null,
      lockers,
      raw: reg,
    };

    return NextResponse.json({ data: normalized });
  } catch (err: unknown) {
    // Handle authentication errors with proper 401 response
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("API Error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
