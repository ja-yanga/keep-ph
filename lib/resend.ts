import { Resend } from "resend";

let resendInstance: Resend | null = null;

/**
 * Returns the Resend client. Creates it lazily so the build can succeed
 * when RESEND_API_KEY is not set (e.g. in CI). At runtime, calls will fail
 * if the key is missing unless you check getResend() for null.
 */
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.trim() === "") {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(key);
  }
  return resendInstance;
}

/** @deprecated Use getResend() for lazy init. Kept for backward compatibility; throws if key missing. */
export const resend = new Proxy({} as Resend, {
  get(_, prop) {
    const client = getResend();
    if (!client) {
      throw new Error(
        "Missing RESEND_API_KEY. Set it in .env.local for send-email to work.",
      );
    }
    return (client as unknown as Record<string, unknown>)[prop as string];
  },
});
