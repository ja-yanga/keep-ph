import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminListErrorLogs } from "@/app/actions/get";
import { isValidUUID } from "@/utils/validate-uuid";
import { logApiError } from "@/lib/error-log";

export async function GET(req: Request) {
  try {
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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const error_type = searchParams.get("error_type");
    const error_code = searchParams.get("error_code");
    const request_path = searchParams.get("request_path");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const user_id = searchParams.get("user_id");
    const sort_by = searchParams.get("sort_by");
    const sort_direction = searchParams.get("sort_direction");
    const error_resolved_param = searchParams.get("error_resolved");

    if (user_id && !isValidUUID(user_id)) {
      void logApiError(req, {
        status: 400,
        message: "Invalid user_id format.",
        errorCode: "VALIDATION_ERROR",
      });
      return NextResponse.json(
        { error: "Invalid user_id format." },
        { status: 400 },
      );
    }

    let error_resolved: boolean | null = null;
    if (error_resolved_param === "true") error_resolved = true;
    if (error_resolved_param === "false") error_resolved = false;

    const data = await adminListErrorLogs({
      limit,
      offset,
      error_type,
      error_code,
      error_resolved,
      date_from,
      date_to,
      request_path,
      user_id,
      sort_by,
      sort_direction,
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("API error fetching error logs:", err);
    const errorMessage = err instanceof Error ? err.message : "Server error";
    void logApiError(req, { status: 500, message: errorMessage, error: err });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
