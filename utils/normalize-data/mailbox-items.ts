export const normalizeMailboxItems = (
  raw: unknown,
): Record<string, unknown>[] => {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((v) =>
          v && typeof v === "object"
            ? (v as Record<string, unknown>)
            : { value: v },
        );
      }
      return parsed && typeof parsed === "object"
        ? [parsed as Record<string, unknown>]
        : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) {
    return raw.map((v) =>
      v && typeof v === "object"
        ? (v as Record<string, unknown>)
        : { value: v },
    );
  }
  if (raw && typeof raw === "object") return [raw as Record<string, unknown>];
  return [];
};
