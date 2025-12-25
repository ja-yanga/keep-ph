import { NextResponse } from "next/server";
import { getDashboardContent } from "@/app/actions/get";

export async function GET() {
  try {
    const stats = await getDashboardContent();
    return NextResponse.json(stats ?? {});
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
