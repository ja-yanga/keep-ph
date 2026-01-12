import { MailroomStats } from "./types";

/**
 * Calculates stats from mailbox items
 */
export const calculateStatsFromMailroomItems = (
  items: Record<string, unknown>[],
): MailroomStats => {
  const seen = new Set<string>();
  let stored = 0;
  let pending = 0;
  let released = 0;

  items.forEach((p) => {
    const idVal = (p["mailbox_item_id"] ??
      p["id"] ??
      p["package_id"] ??
      p["mailbox_item_id_raw"]) as unknown;
    const id = idVal == null ? "" : String(idVal);
    if (id && seen.has(id)) return;
    if (id) seen.add(id);

    const statusVal = (p["mailbox_item_status"] ??
      p["status"] ??
      p["state"]) as unknown;
    const s = String(statusVal ?? "").toUpperCase();

    if (s === "RELEASED") released += 1;
    if (s.includes("REQUEST")) pending += 1;
    if (!["RELEASED", "RETRIEVED", "DISPOSED"].includes(s)) stored += 1;
  });

  return { stored, pending, released };
};
