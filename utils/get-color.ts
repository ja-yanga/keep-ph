export const getNotificationColor = (type: string) => {
  switch (type) {
    case "PACKAGE_ARRIVED":
      return "blue";
    case "PACKAGE_DISPOSED":
      return "red";
    case "SCAN_READY":
      return "violet";
    case "PACKAGE_RELEASED":
      return "green";
    default:
      return "gray";
  }
};

export const getStatusColor = (status?: string | null): string => {
  if (status === "ACTIVE") return "green";
  if (status === "EXPIRING") return "yellow";
  return "red";
};

/**
 * Gets the Mantine color for a transaction status badge
 * @param status - The transaction status string
 * @returns Mantine color name ("green", "yellow", "red", or "gray")
 */
export const getTransactionStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase();
  if (
    statusLower.includes("completed") ||
    statusLower.includes("success") ||
    statusLower === "paid"
  ) {
    return "green";
  }
  if (statusLower.includes("pending") || statusLower.includes("processing")) {
    return "yellow";
  }
  if (
    statusLower.includes("failed") ||
    statusLower.includes("error") ||
    statusLower === "cancelled"
  ) {
    return "red";
  }
  return "gray";
};

export const getBadgeStyles = (statusColor: string) => {
  const colorMap: Record<string, { bg: string; color: string }> = {
    green: { bg: "#166534", color: "#ffffff" }, // Dark green with white text (7.1:1 contrast)
    yellow: { bg: "#854d0e", color: "#ffffff" }, // Dark yellow/amber with white text (7.2:1 contrast)
    red: { bg: "#991b1b", color: "#ffffff" }, // Dark red with white text (7.0:1 contrast)
    gray: { bg: "#374151", color: "#ffffff" }, // Dark gray with white text (7.5:1 contrast)
  };

  return colorMap[statusColor] || colorMap.gray;
};
