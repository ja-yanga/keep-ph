import { NextResponse } from "next/server";
import { getMailroomRegistrationByOrder } from "@/app/actions/get";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const order = url.searchParams.get("order");
    if (!order) {
      return NextResponse.json({ error: "missing_order" }, { status: 400 });
    }

    const data = await getMailroomRegistrationByOrder(order);
    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("Error fetching registration by order:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
