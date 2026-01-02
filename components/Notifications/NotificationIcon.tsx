import { T_NotificationType } from "@/utils/types";
import {
  IconBell,
  IconPackage,
  IconTrash,
  IconScan,
  IconCheck,
} from "@tabler/icons-react";

export const NotificationIcon = ({ type }: { type: T_NotificationType }) => {
  switch (type) {
    case "PACKAGE_ARRIVED":
      return <IconPackage size={16} />;
    case "PACKAGE_DISPOSED":
      return <IconTrash size={16} />;
    case "SCAN_READY":
      return <IconScan size={16} />;
    case "PACKAGE_RELEASED":
      return <IconCheck size={16} />;
    default:
      return <IconBell size={16} />;
  }
};
