import { getAuthenticatedUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getMailroomRegistration } from "@/app/actions/get";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    // This helper automatically handles session refresh and picks up
    // the Authorization: Bearer token from headers OR cookies via createClient().
    // Passing isAPI=true throws an error (instead of redirecting) for proper API responses.
    const { user } = await getAuthenticatedUser(true);

    // 1. Fetch Registration with relations using server action
    const result = await getMailroomRegistration(user.id, id);

    if (!result || !result.registration) {
      return NextResponse.json(
        { error: "Registration not found or unauthorized" },
        { status: 404 },
      );
    }

    const { registration, lockers: assignedLockers } = result;

    // 3. Format the response
    const lockers =
      (assignedLockers as Array<Record<string, unknown>>)
        ?.map((a) => {
          const locker = a.location_locker_table;
          if (!locker) return null;
          return {
            ...(locker as Record<string, unknown>),
            status: a.mailroom_assigned_locker_status,
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
