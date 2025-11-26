import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(_: Request) {
  try {
    // Note: it's usually fine to call signOut from the client.
    // This server endpoint attempts to sign out with the Supabase client you have configured.
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Signed out" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
