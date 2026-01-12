"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Group,
  ActionIcon,
  Popover,
  Text,
  Stack,
  ScrollArea,
  ThemeIcon,
  Divider,
  Loader,
  Center,
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

const LIMIT = 10;

const Notifications = () => {
  const router = useRouter();
  const supabase = createClient();
  const [notifOpen, setNotifOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<
    T_TransformedNotification[]
  >([]);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  const { session } = useSession();
  const userId = useMemo(() => session?.user?.id, [session]);
  const role = useMemo(() => session?.role, [session]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  // Intersection Observer ref for infinite scroll
  // const observerTarget = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch notifications function
  const fetchNotifications = useCallback(
    async (currentOffset: number, isInitial = false) => {
      if (!userId || !isValidUUID(userId)) {
        console.log("❌ Invalid or missing userId, returning");
        return;
      }
      console.log(isInitial, "initial");
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await fetch(
          `${API_ENDPOINTS.notifications}?userId=${encodeURIComponent(userId)}&limit=${LIMIT}&offset=${currentOffset}`,
          {
            method: "GET",
          },
        );
        const data = await response.json();
        const transformData = data.map(transformNotification);

        if (isInitial) {
          setNotifications(transformData);
        } else {
          setNotifications((prev) => {
            // Create a Set of existing IDs for O(1) lookup
            const existingIds = new Set(prev.map((n) => n.id));
            // Filter out duplicates
            const newNotifications = transformData.filter(
              (n: Record<string, unknown>) => !existingIds.has(n.id as string),
            );
            return [...prev, ...newNotifications];
          });
        }

        // If we got fewer items than the limit, there's no more data
        setHasMore(transformData.length === LIMIT);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        if (isInitial) {
          setInitialLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [userId],
  );

  // Initial fetch
  useEffect(() => {
    if (!userId || !isValidUUID(userId)) {
      console.log("❌ Invalid or missing userId, returning");
      return;
    }

    fetchNotifications(0, true);

    // Real-time subscription
    const channel = supabase
      .channel(`notifications-test-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_table",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("🎉 REALTIME TRIGGERED!", payload);
          // Reset and fetch from beginning when new notification arrives
          setOffset(0);
          fetchNotifications(0, true);
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
  }, [userId, fetchNotifications, supabase]);

  // Intersection Observer for infinite scroll
  // Intersection Observer ref for infinite scroll - use callback ref
  // const observerTarget = useRef<HTMLDivElement>(null);

  // Callback ref to handle when element is mounted
  const setObserverTarget = useCallback(
    (node: HTMLDivElement | null) => {
      console.log("🎯 Callback ref triggered, node:", node);

      // Clean up previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // observerTarget.current = node;
      console.log(initialLoading);
      // Set up new observer if node exists and conditions are met
      if (node && hasMore && !initialLoading) {
        console.log("✅ Setting up observer", offset);
        observerRef.current = new IntersectionObserver(
          (entries) => {
            console.log("👀 Observer triggered:", entries[0].isIntersecting);
            if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
              const newOffset = offset + LIMIT;
              console.log("📥 Loading more, new offset:", newOffset);
              setOffset(newOffset);
              fetchNotifications(newOffset);
            }
          },
          {
            threshold: 0.1,
          },
        );

        observerRef.current.observe(node);
      }
    },
    [hasMore, isLoadingMore, offset, fetchNotifications, initialLoading],
  );

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Mark all as read
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
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={() => setNotifOpen((o) => !o)}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            style={{ position: "relative" }}
          >
            <IconBell size={20} />
            {unreadCount > 0 && (
              <span className={styles.srOnly} aria-hidden="true">
                {unreadCount}
              </span>
            )}
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown p={0}>
          <Box p="sm" bg="gray.0">
            <Text size="sm" fw={700}>
              Notifications
            </Text>
          </Box>
          <Divider />
          <ScrollArea h={300}>
            {initialLoading && (
              <Center h={300}>
                <Loader size="sm" />
              </Center>
            )}

            {!initialLoading && notifications.length === 0 && (
              <NotificationEmpty />
            )}

            {!initialLoading && notifications.length > 0 && (
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

                {!hasMore && (
                  <Center p="sm">
                    <Text size="xs" c="dimmed">
                      No more notifications
                    </Text>
                  </Center>
                )}
              </Stack>
            )}

            {/* Sentinel - outside Stack so it's always available */}
            <div
              ref={setObserverTarget}
              style={{
                minHeight: "1px",
                visibility:
                  hasMore && !initialLoading && notifications.length > 0
                    ? "visible"
                    : "hidden",
              }}
            >
              <Center p="md">{isLoadingMore && <Loader size="sm" />}</Center>
            </div>
          </ScrollArea>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
};

export default Notifications;
