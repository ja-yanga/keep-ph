import { NextResponse } from "next/server";
import { getMailroomLocations } from "@/app/actions/get";

export async function GET() {
  try {
    const locations = await getMailroomLocations();
    return NextResponse.json({ data: locations }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("Error fetching mailroom locations:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
