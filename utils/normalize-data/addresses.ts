export const normalizeAddresses = (payload: unknown) => {
  // Normalize API shape to internal Address shape (avoid nested ternary)
  let rows: Record<string, unknown>[] = [];
  if (Array.isArray(payload as Record<string, unknown>)) {
    rows = payload as Record<string, unknown>[];
  } else if (Array.isArray(payload)) {
    rows = payload as Record<string, unknown>[];
  } else {
    rows = [];
  }
  return rows;
};
