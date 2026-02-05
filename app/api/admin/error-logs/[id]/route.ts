import { NextResponse } from "next/server";
import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { isValidUUID } from "@/utils/validate-uuid";
import { logActivity } from "@/lib/activity-log";
import { logApiError } from "@/lib/error-log";

type RouteParams = { id: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<RouteParams> | RouteParams },
) {
  try {
    const resolvedParams = await params;
    const errorLogId = resolvedParams.id;

    if (!isValidUUID(errorLogId)) {
      void logApiError(_req, {
        status: 400,
        message: "Invalid error log id.",
        errorCode: "VALIDATION_ERROR",
      });
      return NextResponse.json(
        { error: "Invalid error log id." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: roleData } = await supabase.rpc("get_user_role", {
      input_user_id: user.id,
    });

    if (roleData !== "admin" && roleData !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = createSupabaseServiceClient();
    const { data, error } = await supabaseAdmin
      .from("error_log_table")
      .select(
        `
        error_log_id,
        user_id,
        error_type,
        error_code,
        error_message,
        error_stack,
        request_path,
        request_method,
        request_body,
        request_headers,
        response_status,
        error_details,
        ip_address,
        user_agent,
        error_resolved,
        error_resolved_at,
        error_resolved_by,
        error_resolution_notes,
        error_created_at,
        user:users_table!error_log_table_user_id_fkey(users_id, users_email),
        resolved_by:users_table!error_log_table_error_resolved_by_fkey(users_id, users_email)
      `,
      )
      .eq("error_log_id", errorLogId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching error log:", error);
      void logApiError(_req, {
        status: 500,
        message: "Failed to fetch error log.",
        error,
      });
      return NextResponse.json(
        { error: "Failed to fetch error log." },
        { status: 500 },
      );
    }

    if (!data) {
      void logApiError(_req, {
        status: 404,
        message: "Error log not found.",
      });
      return NextResponse.json(
        { error: "Error log not found." },
        { status: 404 },
      );
    }

    const userRow = Array.isArray(data.user) ? data.user[0] : data.user;
    const resolvedByRow = Array.isArray(data.resolved_by)
      ? data.resolved_by[0]
      : data.resolved_by;
    const response = {
      ...data,
      user_email: userRow?.users_email ?? null,
      resolved_by_email: resolvedByRow?.users_email ?? null,
      user: undefined,
      resolved_by: undefined,
    };

    void logActivity({
      userId: user.id,
      action: "VIEW",
      type: "ADMIN_ACTION",
      entityType: "ERROR_LOG",
      entityId: errorLogId,
      details: {
        error_type: data.error_type,
        error_code: data.error_code ?? null,
        error_resolved: data.error_resolved ?? false,
      },
    });

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("API error fetching error log:", err);
    const errorMessage = err instanceof Error ? err.message : "Server error";
    void logApiError(_req, { status: 500, message: errorMessage, error: err });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<RouteParams> | RouteParams },
) {
  try {
    const resolvedParams = await params;
    const errorLogId = resolvedParams.id;

    if (!isValidUUID(errorLogId)) {
      void logApiError(request, {
        status: 400,
        message: "Invalid error log id.",
        errorCode: "VALIDATION_ERROR",
      });
      return NextResponse.json(
        { error: "Invalid error log id." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: roleData } = await supabase.rpc("get_user_role", {
      input_user_id: user.id,
    });

    if (roleData !== "admin" && roleData !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const hasResolved = Object.prototype.hasOwnProperty.call(
      body,
      "error_resolved",
    );
    const hasNotes = Object.prototype.hasOwnProperty.call(
      body,
      "error_resolution_notes",
    );

    if (!hasResolved && !hasNotes) {
      void logApiError(request, {
        status: 400,
        message: "No updatable fields provided.",
      });
      return NextResponse.json(
        { error: "No updatable fields provided." },
        { status: 400 },
      );
    }

    let incomingResolved: boolean | undefined;
    if (hasResolved) {
      if (typeof body.error_resolved !== "boolean") {
        void logApiError(request, {
          status: 400,
          message: "error_resolved must be a boolean.",
        });
        return NextResponse.json(
          { error: "error_resolved must be a boolean." },
          { status: 400 },
        );
      }
      incomingResolved = body.error_resolved;
    }

    let incomingNotes: string | null | undefined;
    if (hasNotes) {
      if (body.error_resolution_notes === null) {
        incomingNotes = null;
      } else if (typeof body.error_resolution_notes === "string") {
        const trimmed = body.error_resolution_notes.trim();
        incomingNotes = trimmed.length > 0 ? body.error_resolution_notes : null;
      } else {
        void logApiError(request, {
          status: 400,
          message: "error_resolution_notes must be a string or null.",
        });
        return NextResponse.json(
          { error: "error_resolution_notes must be a string or null." },
          { status: 400 },
        );
      }
    }

    const supabaseAdmin = createSupabaseServiceClient();
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("error_log_table")
      .select(
        "error_log_id, error_resolved, error_resolution_notes, error_type, error_code",
      )
      .eq("error_log_id", errorLogId)
      .maybeSingle();

    if (existingError) {
      console.error("Error fetching error log for update:", existingError);
      void logApiError(request, {
        status: 500,
        message: "Failed to fetch error log for update.",
        error: existingError,
      });
      return NextResponse.json(
        { error: "Failed to fetch error log for update." },
        { status: 500 },
      );
    }

    if (!existing) {
      void logApiError(request, {
        status: 404,
        message: "Error log not found.",
      });
      return NextResponse.json(
        { error: "Error log not found." },
        { status: 404 },
      );
    }

    const previousResolved = existing.error_resolved === true;
    const normalizedExistingNotes =
      existing.error_resolution_notes?.trim() === ""
        ? null
        : existing.error_resolution_notes;
    const normalizedIncomingNotes = hasNotes
      ? (incomingNotes ?? null)
      : undefined;

    const wantsResolveChange =
      typeof incomingResolved === "boolean" &&
      incomingResolved !== previousResolved;
    const wantsNotesChange =
      hasNotes && normalizedIncomingNotes !== normalizedExistingNotes;

    if (previousResolved && !wantsResolveChange && wantsNotesChange) {
      void logApiError(request, {
        status: 400,
        message: "Resolution notes cannot be edited after resolving.",
      });
      return NextResponse.json(
        { error: "Resolution notes cannot be edited after resolving." },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, unknown> = {};
    let nextResolved = previousResolved;

    if (typeof incomingResolved === "boolean") {
      if (incomingResolved && !previousResolved) {
        updatePayload.error_resolved = true;
        updatePayload.error_resolved_at = new Date().toISOString();
        updatePayload.error_resolved_by = user.id;
        nextResolved = true;
      } else if (!incomingResolved && previousResolved) {
        updatePayload.error_resolved = false;
        updatePayload.error_resolved_at = null;
        updatePayload.error_resolved_by = null;
        nextResolved = false;
      }
    }

    if (hasNotes && wantsNotesChange) {
      updatePayload.error_resolution_notes = normalizedIncomingNotes;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ ok: true, updated: false });
    }

    const { error: updateError } = await supabaseAdmin
      .from("error_log_table")
      .update(updatePayload)
      .eq("error_log_id", errorLogId);

    if (updateError) {
      console.error("Error updating error log:", updateError);
      void logApiError(request, {
        status: 500,
        message: "Failed to update error log.",
        error: updateError,
      });
      return NextResponse.json(
        { error: "Failed to update error log." },
        { status: 500 },
      );
    }

    void logActivity({
      userId: user.id,
      action: "UPDATE",
      type: "ADMIN_ACTION",
      entityType: "ERROR_LOG",
      entityId: errorLogId,
      details: {
        error_type: existing.error_type,
        error_code: existing.error_code ?? null,
        previous_resolved: previousResolved,
        new_resolved: nextResolved,
        notes: hasNotes ? normalizedIncomingNotes : undefined,
      },
    });

    return NextResponse.json({ ok: true, updated: true });
  } catch (err: unknown) {
    console.error("API error updating error log:", err);
    const errorMessage = err instanceof Error ? err.message : "Server error";
    void logApiError(request, {
      status: 500,
      message: errorMessage,
      error: err,
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
