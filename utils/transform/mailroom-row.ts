import { MailroomRow, MailroomStats, RawRow } from "../types";
import { normalizeMailboxItems } from "../normalize-data/mailbox-items";
import { calculateStatsFromMailroomItems } from "../calculate-stats-from-mailroom-items";
import { extractSubscriberName } from "../extract-subscriber-name";
import { computeMailroomStatus } from "../compute-mailroom-status";
import { addMonths } from "../helper";

/**
 * Transforms raw API data into normalized MailroomRow objects
 */
export const trasnformMailroomRow = (data: RawRow[]): MailroomRow[] => {
  return data.map((r) => {
    const planObj = r.mailroom_plan_table ?? null;
    const planName = planObj?.mailroom_plan_name ?? null;
    const planMonths =
      typeof planObj?.mailroom_plan_price === "number"
        ? Number(planObj.mailroom_plan_price)
        : null;

    const locObj = r.mailroom_location_table ?? null;
    const locationName = locObj?.mailroom_location_name ?? null;
    const created = r.mailroom_registration_created_at ?? null;

    // Subscription overrides expiry/auto_renew when available
    const subscription = r.subscription_table ?? null;
    const expiryFromSub = subscription?.subscription_expires_at ?? null;
    const autoRenew =
      typeof subscription?.subscription_auto_renew === "boolean"
        ? subscription.subscription_auto_renew
        : true;

    const expiry =
      expiryFromSub ??
      (planMonths ? addMonths(created, Number(planMonths)) : null);

    const computedStatus = computeMailroomStatus(
      expiry,
      autoRenew,
      r.mailroom_registration_status ?? false,
    );

    // Normalize mailbox items
    const rawItems: unknown =
      (r as unknown as Record<string, unknown>)["mailbox_item_table"] ??
      (r as unknown as Record<string, unknown>)["mailbox_items"] ??
      (r as unknown as Record<string, unknown>)["items"] ??
      [];
    const items = normalizeMailboxItems(rawItems);

    // Prefer server-provided stats if present
    const rpcStats = (r as Record<string, unknown>)["_stats"] as unknown;
    let stats: MailroomStats;

    if (rpcStats && typeof rpcStats === "object") {
      const statsObj = rpcStats as Record<string, unknown>;
      stats = {
        stored: Number(statsObj.stored ?? 0),
        pending: Number(statsObj.pending ?? 0),
        released: Number(statsObj.released ?? 0),
      };
    } else {
      stats = calculateStatsFromMailroomItems(items);
    }

    const userObj = r.users_table ?? null;
    const name = extractSubscriberName(r, locationName);

    return {
      id: String(r.mailroom_registration_id ?? ""),
      mailroom_code: r.mailroom_registration_code ?? null,
      name,
      email: userObj?.users_email ?? null,
      plan: planName,
      location: locationName,
      created_at: created,
      expiry_at: expiry,
      mailroom_status: computedStatus,
      auto_renew: autoRenew,
      stats,
      raw: r,
    };
  });
};
