import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, proof_base64 } = body;

    if (!["PROCESSING", "PAID"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // fetch existing claim to compare status and get user_id
    const { data: oldClaim, error: oldErr } = await supabaseAdmin
      .from("rewards_claims")
      .select("id, user_id, status, amount")
      .eq("id", id)
      .single();
    if (oldErr || !oldClaim) throw oldErr || new Error("Claim not found");

    // prepare updates
    const updates: any = { status };
    if (status === "PAID") updates.processed_at = new Date().toISOString();

    // If a proof image was provided, upload it to storage
    if (proof_base64) {
      const BUCKET = "reward-proofs";
      // expected proof_base64 format: data:<mime>;base64,<data>
      const matches = String(proof_base64).match(/^data:(.+);base64,(.+)$/);
      let mime = "application/octet-stream";
      let b64 = String(proof_base64);
      if (matches) {
        mime = matches[1];
        b64 = matches[2];
      } else if (b64.includes(",")) {
        b64 = b64.split(",")[1];
      }
      const ext = mime.split("/")[1] || "bin";

      const userId = oldClaim.user_id;
      const path = `${userId}/${id}.${ext}`;

      // upload buffer (Node Buffer)
      const buffer = Buffer.from(b64, "base64");
      const { data: upData, error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType: mime,
          upsert: true,
        });

      if (upErr) {
        console.error("storage upload error", upErr);
        return NextResponse.json(
          { error: "Failed to upload proof" },
          { status: 500 }
        );
      }

      // save path to DB so we can later generate signed URL for admin UI
      updates.proof_path = path;
    }

    const { data, error } = await supabaseAdmin
      .from("rewards_claims")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // optionally create a signed URL to return immediately (1 hour)
    let signedUrl: string | null = null;
    if (updates.proof_path) {
      const BUCKET = "reward-proofs";
      try {
        const { data: urlData, error: urlErr } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(updates.proof_path, 60 * 60); // 1 hour
        if (!urlErr && urlData?.signedUrl) signedUrl = urlData.signedUrl;
      } catch (e) {
        // ignore
      }
    }

    // SEND NOTIFICATION (pattern copied from mailroom packages route)
    try {
      if (oldClaim.status !== data.status && oldClaim.user_id) {
        const userId = oldClaim.user_id;
        let title = "Reward Update";
        let message = `Your reward request (${String(id).slice(
          0,
          8
        )}) status is now: ${data.status}`;
        let type: any = "SYSTEM";

        if (data.status === "PROCESSING") {
          title = "Reward Processing";
          message = `Your reward request (${String(id).slice(
            0,
            8
          )}) is now being processed.`;
          type = "REWARD_PROCESSING";
        } else if (data.status === "PAID") {
          const amount = data.amount ?? oldClaim.amount ?? "—";
          title = "Reward Paid";
          message = `Your reward request (${String(id).slice(
            0,
            8
          )}) has been paid. Amount: PHP ${amount}.`;
          type = "REWARD_PAID";
        }

        await sendNotification(userId, title, message, type, "/referrals");
      }
    } catch (notifyErr) {
      console.error("Failed to send notification:", notifyErr);
      // continue — do not fail the main request because notification failed
    }

    return NextResponse.json({
      ok: true,
      claim: data,
      proof_url: signedUrl || null,
    });
  } catch (err: any) {
    console.error("admin.rewards.update:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
