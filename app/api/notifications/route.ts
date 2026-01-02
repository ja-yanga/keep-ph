import { NextResponse } from "next/server";
import { getNotificationByUserId } from "@/app/actions/get";
import { markAsReadNotification } from "@/app/actions/update";
import { sendNotification } from "@/app/actions/post";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 },
      );
    }

    const notifications = await getNotificationByUserId(userId);
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
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await sendNotification(userId, title, message, type, link);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unexpected error in sendNotification route:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
