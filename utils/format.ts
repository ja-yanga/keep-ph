/**
 * Formats a date string to a readable format
 * @param dateString - The date string to format (ISO string or null/undefined)
 * @returns Formatted date string (e.g., "Jan 15, 2024, 10:30 AM") or "—" if invalid
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

/**
 * Formats a date string to a short format (date only, no time)
 * @param dateString - The date string to format
 * @returns Formatted date string (e.g., "Jan 15, 2024") or "—" if invalid
 */
export const formatDateShort = (
  dateString: string | null | undefined,
): string => {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

/**
 * Formats a number as Philippine Peso currency
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "₱1,234.56")
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};
