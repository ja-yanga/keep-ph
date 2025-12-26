import { NextResponse } from "next/server";
import { getLocationAvailability } from "@/app/actions/get";

export async function GET(_req: Request) {
  void _req;
  try {
    const counts = await getLocationAvailability();
    return NextResponse.json({ data: counts }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("Error fetching location availability:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
