export const getStatusFormat = (status: string = ""): string => {
  const colorGroups = {
    green: ["VERIFIED"],
    blue: [],
    yellow: ["SUBMITTED"],
    red: ["REJECTED"],
    orange: [],
  };

  const statusToColor = Object.entries(colorGroups).reduce(
    (acc, [color, statuses]) => {
      statuses.forEach((s) => (acc[s] = color));
      return acc;
    },
    {} as Record<string, string>,
  );

  return statusToColor[status.toUpperCase()] || "gray";
};
