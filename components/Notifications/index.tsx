"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Group,
  ActionIcon,
  Popover,
  Text,
  Stack,
  Indicator,
  ScrollArea,
  ThemeIcon,
  Divider,
} from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { isValidUUID } from "@/utils/validate-uuid";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  T_TransformedNotification,
  transformNotification,
} from "@/utils/transform/notification";
import { getNotificationColor } from "@/utils/get-color";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { useSession } from "../SessionProvider";
import { NotificationIcon } from "./NotificationIcon";
import { useMemo } from "react";
import NotificationEmpty from "./NotificationEmpty";
import { T_NotificationType } from "@/utils/types";
import styles from "./Notifications.module.css";

const Notifications = () => {
  const router = useRouter();
  const supabase = createClient();
  const [notifOpen, setNotifOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<
    T_TransformedNotification[]
  >([]);
  const { session } = useSession();
  const userId = useMemo(() => session?.user?.id, [session]);
  const role = useMemo(() => session?.role, [session]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  useEffect(() => {
    if (!userId || !isValidUUID(userId)) {
      console.log("❌ Invalid or missing userId, returning");
      return;
    }
    const fetchNotifications = async () => {
      try {
        const response = await fetch(
          `${API_ENDPOINTS.notifications}?userId=${encodeURIComponent(userId)}`,
          {
            method: "GET",
          },
        );
        const data = await response.json();
        const transformData = data.map(transformNotification);
        setNotifications(transformData);
      } catch (error) {
        console.error("Error fetching mailroom registrations:", error);
      }
    };
    fetchNotifications();

    // Test WITHOUT filter first
    const channel = supabase
      .channel(`notifications-test-${Date.now()}`) // Unique channel name
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_table",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          fetchNotifications();
          console.log("🎉 REALTIME TRIGGERED (NO FILTER)!", payload);
        },
      )
      .subscribe((status, err) => {
        console.log("📡 Subscription status:", status);
        if (err) console.error("❌ Subscription error:", err);
      });

    return () => {
      console.log("🧹 CLEANUP: Removing channel");
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // mark all as read (optimistic update + persist)
  const markAsRead = async () => {
    if (!isValidUUID(userId) || role !== "user") return;
    await fetch(
      `${API_ENDPOINTS.notifications}?userId=${encodeURIComponent(userId as string)}`,
      {
        method: "PUT",
      },
    );
  };

  return (
    <div>
      <Popover
        width={320}
        position="bottom-end"
        withArrow
        shadow="md"
        opened={notifOpen}
        onChange={setNotifOpen}
        onClose={markAsRead}
      >
        <Popover.Target>
          <Indicator
            color="red"
            size={16}
            label={unreadCount}
            disabled={unreadCount === 0}
            offset={4}
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              radius="xl"
              size="lg"
              aria-label="notifications"
              onClick={() => setNotifOpen((o) => !o)}
            >
              <IconBell size={20} />
            </ActionIcon>
          </Indicator>
        </Popover.Target>
        <Popover.Dropdown p={0}>
          <Box p="sm" bg="gray.0">
            <Text size="sm" fw={700}>
              Notifications
            </Text>
          </Box>
          <Divider />
          <ScrollArea h={300}>
            {notifications.length === 0 ? (
              <NotificationEmpty />
            ) : (
              <Stack gap={0}>
                {notifications.map((n) => (
                  <Box
                    key={n.id}
                    p="sm"
                    style={{
                      borderBottom: "1px solid #f1f3f5",
                      backgroundColor: n.is_read ? "white" : "#f8f9fa",
                      cursor: n.link ? "pointer" : "default",
                    }}
                    className={styles.boxCard}
                    onClick={() => {
                      if (n.link) router.push(n.link);
                      setNotifOpen(false);
                    }}
                  >
                    <Group align="flex-start" wrap="nowrap">
                      <ThemeIcon
                        color={getNotificationColor(n.type)}
                        variant="light"
                        size="md"
                        radius="xl"
                        mt={2}
                      >
                        {/* {getIcon(n.type)} */}
                        <NotificationIcon type={n.type as T_NotificationType} />
                      </ThemeIcon>
                      <Box style={{ flex: 1 }}>
                        <Text size="sm" fw={600} lh={1.2} mb={2}>
                          {n.title}
                        </Text>
                        <Text size="xs" c="dimmed" lh={1.4}>
                          {n.message}
                        </Text>
                        <Text
                          size="xs"
                          c="dimmed"
                          mt={4}
                          style={{ fontSize: 10 }}
                        >
                          {new Date(n.created_at).toLocaleString()}
                        </Text>
                      </Box>
                      {!n.is_read && (
                        <Box
                          w={8}
                          h={8}
                          bg="blue"
                          style={{ borderRadius: "50%" }}
                          mt={6}
                        />
                      )}
                    </Group>
                  </Box>
                ))}
              </Stack>
            )}
          </ScrollArea>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
};

export default Notifications;
