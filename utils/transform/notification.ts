import { T_NotificationType } from "../types";

// Add this type definition
export type T_TransformedNotification = {
  id: string;
  title: string;
  message: string;
  type: T_NotificationType;
  is_read: boolean;
  created_at: string;
  link: string;
};

// Notification Type Definition
export type T_Notification = {
  notification_id: string;
  notification_title: string;
  notification_message: string;
  notification_type: T_NotificationType;
  notification_is_read: boolean;
  notification_created_at: string;
  notification_link?: string;
};

export const transformNotification = (
  data: T_Notification,
): T_TransformedNotification => {
  return {
    id: data.notification_id || "",
    title: data.notification_title || "",
    message: data.notification_message || "",
    type: data.notification_type || "",
    is_read: data.notification_is_read || false,
    created_at: data.notification_created_at || "",
    link: data.notification_link || "",
  };
};
