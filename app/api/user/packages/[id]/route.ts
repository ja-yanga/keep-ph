import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const supabaseAdmin = createSupabaseServiceClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    const body = (await request.json()) as Record<string, unknown>;

    // Authenticate user via cookie
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = user.id;

    // 1) Fetch mailbox item to determine registration ownership
    const { data: itemRow, error: itemErr } = await supabaseAdmin
      .from("mailbox_item_table")
      .select("mailbox_item_id, mailroom_registration_id")
      .eq("mailbox_item_id", id)
      .single();

    if (itemErr || !itemRow) {
      return NextResponse.json(
        { error: "Mailbox item not found" },
        { status: 404 },
      );
    }

    const registrationId = (itemRow as Record<string, unknown>)
      .mailroom_registration_id as string | undefined;
    if (!registrationId) {
      return NextResponse.json(
        { error: "Registration not linked" },
        { status: 400 },
      );
    }

    // 2) Verify registration belongs to authenticated user
    const { data: regRow, error: regErr } = await supabaseAdmin
      .from("mailroom_registration_table")
      .select("mailroom_registration_id, user_id")
      .eq("mailroom_registration_id", registrationId)
      .single();

    if (regErr || !regRow) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }
    if ((regRow as Record<string, unknown>).user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3) Build mailbox_item updates (map client fields to schema)
    const updates: Record<string, unknown> = {};

    // validate and apply status only if allowed
    const ALLOWED_STATUSES = [
      "STORED",
      "RELEASED",
      "RETRIEVED",
      "DISPOSED",
      "REQUEST_TO_RELEASE",
      "REQUEST_TO_DISPOSE",
      "REQUEST_TO_SCAN",
    ];
    if (body.status !== undefined) {
      const s = String(body.status);
      if (ALLOWED_STATUSES.includes(s)) updates.mailbox_item_status = s;
      else
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // support updated timestamps handled by DB
    // Handle selected address (user_address_table)
    if (Object.prototype.hasOwnProperty.call(body, "selected_address_id")) {
      // allow null to clear saved address
      const selectedAddressIdRaw = body.selected_address_id;
      const selectedAddressId =
        selectedAddressIdRaw === null ? null : String(selectedAddressIdRaw);
      if (selectedAddressId) {
        const { data: addr, error: addrErr } = await supabaseAdmin
          .from("user_address_table")
          .select(
            "user_address_id, user_id, user_address_label, user_address_line1, user_address_line2, user_address_city, user_address_region, user_address_postal",
          )
          .eq("user_address_id", selectedAddressId)
          .single();

        if (addrErr || !addr) {
          return NextResponse.json(
            { error: "Selected address not found" },
            { status: 400 },
          );
        }
        if ((addr as Record<string, unknown>).user_id !== userId) {
          return NextResponse.json(
            { error: "Address does not belong to this user" },
            { status: 403 },
          );
        }

        const formatted = [
          (addr as Record<string, unknown>).user_address_label ?? "",
          (addr as Record<string, unknown>).user_address_line1 ?? "",
          (addr as Record<string, unknown>).user_address_line2 ?? "",
          (addr as Record<string, unknown>).user_address_city ?? "",
          (addr as Record<string, unknown>).user_address_region ?? "",
          (addr as Record<string, unknown>).user_address_postal ?? "",
        ]
          .filter(Boolean)
          .join(", ");

        updates.user_address_id = selectedAddressId;
        updates.mailbox_item_release_address = formatted;
      } else {
        // clear the address/release snapshot
        updates.user_address_id = null;
        updates.mailbox_item_release_address = null;
      }
    }

    // Optional: include forward address / tracking fields into mail_action_request if provided
    const forwardAddress =
      typeof body.forward_address === "string"
        ? body.forward_address
        : undefined;
    const forwardTracking =
      typeof body.forward_tracking_number === "string"
        ? body.forward_tracking_number
        : undefined;
    const forward3pl =
      typeof body.forward_3pl_name === "string"
        ? body.forward_3pl_name
        : undefined;
    const forwardTrackingUrl =
      typeof body.forward_tracking_url === "string"
        ? body.forward_tracking_url
        : undefined;

    // 4) Update mailbox_item_table row
    const { data, error } = await supabaseAdmin
      .from("mailbox_item_table")
      .update(updates)
      .eq("mailbox_item_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5) If the user requested an action (eg. REQUEST_TO_RELEASE / REQUEST_TO_DISPOSE / REQUEST_TO_SCAN),
    // create a mail_action_request_table entry for processing
    const requestedStatus = updates.mailbox_item_status as string | undefined;
    const requestTypeMap: Record<string, string> = {
      REQUEST_TO_RELEASE: "RELEASE",
      REQUEST_TO_DISPOSE: "DISPOSE",
      REQUEST_TO_SCAN: "SCAN",
    };
    const actionType = requestedStatus
      ? requestTypeMap[requestedStatus]
      : undefined;

    if (actionType) {
      const insertObj: Record<string, unknown> = {
        mailbox_item_id: id,
        user_id: userId,
        mail_action_request_type: actionType,
        mail_action_request_status: "PROCESSING",
      };
      if (forwardAddress)
        insertObj.mail_action_request_forward_address = forwardAddress;
      if (forwardTracking)
        insertObj.mail_action_request_forward_tracking_number = forwardTracking;
      if (forward3pl)
        insertObj.mail_action_request_forward_3pl_name = forward3pl;
      if (forwardTrackingUrl)
        insertObj.mail_action_request_forward_tracking_url = forwardTrackingUrl;

      // Attach release/address snapshot into an existing text column (no schema changes).
      // Serialize release details and store under mail_action_request_forward_address
      // so processing workers can read the release snapshot.
      if (actionType === "RELEASE") {
        const releaseInfo: Record<string, unknown> = {};
        if (
          typeof updates.user_address_id === "string" &&
          updates.user_address_id
        )
          releaseInfo.user_address_id = updates.user_address_id;
        if (
          typeof updates.mailbox_item_release_address === "string" &&
          updates.mailbox_item_release_address
        )
          releaseInfo.release_address = updates.mailbox_item_release_address;

        // parse notes for pickup-on-behalf payload (notes may be JSON string or object)
        let notesObj: Record<string, unknown> | null = null;
        if (typeof body.notes === "string" && body.notes.trim()) {
          try {
            const parsed = JSON.parse(body.notes);
            if (parsed && typeof parsed === "object")
              notesObj = parsed as Record<string, unknown>;
          } catch {
            // ignore invalid JSON
          }
        } else if (body.notes && typeof body.notes === "object") {
          notesObj = body.notes as Record<string, unknown>;
        }

        if (notesObj?.pickup_on_behalf) {
          const name =
            typeof notesObj.name === "string" && notesObj.name.trim()
              ? notesObj.name.trim()
              : undefined;
          const mobile =
            typeof notesObj.mobile === "string" && notesObj.mobile.trim()
              ? notesObj.mobile.trim()
              : undefined;
          const contact_mode =
            typeof notesObj.contact_mode === "string"
              ? notesObj.contact_mode
              : undefined;
          releaseInfo.pickup_on_behalf = {
            name: name ?? null,
            mobile: mobile ?? null,
            contact_mode: contact_mode ?? null,
          };
        }

        let releaseToName: string | undefined;
        if (typeof body.release_to_name === "string" && body.release_to_name)
          releaseToName = body.release_to_name;
        else if (typeof body.releaseToName === "string" && body.releaseToName)
          releaseToName = body.releaseToName;
        if (releaseToName) releaseInfo.release_to_name = releaseToName;

        if (Object.keys(releaseInfo).length > 0) {
          try {
            const existingForward =
              typeof insertObj.mail_action_request_forward_address === "string"
                ? insertObj.mail_action_request_forward_address
                : undefined;
            if (existingForward) {
              insertObj.mail_action_request_forward_address = JSON.stringify({
                forward_address: existingForward,
                release: releaseInfo,
              });
            } else {
              insertObj.mail_action_request_forward_address =
                JSON.stringify(releaseInfo);
            }
          } catch {
            // fallback: store the release_to_name or release_address as plain string if JSON fails
            if (releaseInfo.release_to_name)
              insertObj.mail_action_request_forward_address = String(
                releaseInfo.release_to_name,
              );
            else if (releaseInfo.release_address)
              insertObj.mail_action_request_forward_address = String(
                releaseInfo.release_address,
              );
          }
        }
      }

      const { error: insertErr } = await supabaseAdmin
        .from("mail_action_request_table")
        .insert(insertObj);

      if (insertErr) {
        // log and continue — the mailbox_item update succeeded
        console.error("Failed to create mail action request:", insertErr);
      }
    }

    return NextResponse.json({ ok: true, mailbox_item: data });
  } catch (err: unknown) {
    console.error("Update mailbox item error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
