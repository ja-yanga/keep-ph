"use client";

import {
  Box,
  Container,
  Title,
  Button,
  Center,
  Text,
  Loader,
} from "@mantine/core";
import DashboardNav from "../../components/DashboardNav";
import Footer from "@/components/Footer";
import { useSession } from "@/components/SessionProvider";
import MailroomList from "@/components/MailroomList";
import React, { useEffect, useState } from "react";

export default function DashboardPage() {
  const { session, loading, error } = useSession();
  const firstName = session?.profile?.first_name ?? null;
  const displayName = firstName ?? session?.user?.email ?? "User";

  const [hasMailroom, setHasMailroom] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return; // Wait for session to load

    let mounted = true;
    async function load() {
      if (!session?.user?.id) {
        if (mounted) setHasMailroom(false);
        return;
      }
      try {
        const res = await fetch("/api/mailroom/registrations", {
          credentials: "include",
        });
        if (!mounted) return;
        if (!res.ok) {
          setHasMailroom(false);
          return;
        }
        const json = await res.json().catch(() => ({}));
        const rows = Array.isArray(json?.data ?? json) ? json.data ?? json : [];
        setHasMailroom(rows.length > 0);
      } catch {
        if (mounted) setHasMailroom(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [session?.user?.id, loading]);

  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#FFFFFF",
        fontFamily: "Inter, sans-serif",
        color: "#1A202C",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* replaced inline header with component */}
      <DashboardNav />

      {/* Page content */}
      <Box style={{ flex: 1, paddingTop: 32, paddingBottom: 32 }}>
        {loading || hasMailroom === null ? (
          <Center style={{ paddingTop: 64, paddingBottom: 64 }}>
            <Loader />
          </Center>
        ) : hasMailroom ? (
          <Container size="xl" py="xl">
            <MailroomList />
          </Container>
        ) : (
          <Center style={{ paddingTop: 64, paddingBottom: 64 }}>
            <Container size="lg" style={{ textAlign: "center" }} px="md">
              <Title order={2} fz={36} c="#1A202C" fw={700}>
                Welcome, {loading ? "Loading…" : displayName}!
              </Title>

              <Text
                mt="md"
                c="#718096"
                size="lg"
                style={{ maxWidth: 880 }}
                mx="auto"
              >
                Ready to manage your mail effortlessly? Register for our
                mailroom service to get a dedicated address, receive
                notifications, and manage your packages and letters online.
              </Text>

              <Box mt={28}>
                <Button
                  component="a"
                  href="/register"
                  bg="#26316D"
                  c="white"
                  fw={700}
                  size="lg"
                  radius="md"
                >
                  Register Mailroom Service
                </Button>
              </Box>
            </Container>
          </Center>
        )}
      </Box>

      <Footer />
    </Box>
  );
}
