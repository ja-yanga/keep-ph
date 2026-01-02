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
