import { NextResponse } from "next/server";
import { getNotificationByUserId } from "@/app/actions/get";
import { markAsReadNotification } from "@/app/actions/update";
import { sendNotification } from "@/lib/notifications";
import { logApiError } from "@/lib/error-log";
import { T_NotificationType } from "@/utils/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 },
      );
    }

    const notifications = await getNotificationByUserId(userId, limit, offset);

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Unexpected error in notifications route:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      void logApiError(request, {
        status: 400,
        message: "Missing userId parameter",
      });
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 },
      );
    }

    await markAsReadNotification(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unexpected error in markAsReadNotification route:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, message, type, link } = body;

    if (!userId || !title || !message || !type) {
      void logApiError(request, {
        status: 400,
        message: "Missing required fields",
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await sendNotification(
      userId,
      title,
      message,
      type as T_NotificationType,
      link,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unexpected error in sendNotification route:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    void logApiError(request, { status: 500, message, error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
