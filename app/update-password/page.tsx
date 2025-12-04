"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  Button,
  PasswordInput,
  Paper,
  Title,
  Container,
  Stack,
  Text,
  Loader,
  Center,
  Box,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import Nav from "../../components/Nav";
import SiteFooter from "../../components/Footer";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const initSession = async () => {
      // Check if a session already exists
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setVerifying(false);
        return;
      }

      // If no session, check for recovery tokens in URL hash
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.replace("#", ""));
        const access_token = params.get("access_token")!;
        const refresh_token = params.get("refresh_token")!;

        // Set session manually
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          notifications.show({
            title: "Invalid or expired link",
            message: "Please request a new password reset link.",
            color: "red",
          });
          router.push("/signin");
          return;
        }

        // Clean URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        setVerifying(false);
        return;
      }

      // If no session and no token
      notifications.show({
        title: "Session Expired",
        message: "Please request a new password reset link.",
        color: "red",
      });
      router.push("/signin");
    };

    initSession();
  }, [supabase, router]);

  const handleUpdate = async () => {
    if (!password) return;
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } else {
      // sign out current session so middleware won't redirect an authenticated user
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.debug("signOut failed (ignored):", e);
      }
      // navigate to signin with flag to show confirmation
      router.push("/signin?pw_reset=1");
    }

    setLoading(false);
  };

  if (verifying) {
    return (
      <Box
        bg="gray.0"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Nav />
        <Center style={{ flex: 1 }}>
          <Loader size="lg" />
        </Center>
        <SiteFooter />
      </Box>
    );
  }

  return (
    <Box
      bg="gray.0"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Nav />

      <Center style={{ flex: 1, padding: "40px 0" }}>
        <Container size={420} w="100%">
          <Title
            ta="center"
            order={2}
            style={{ fontFamily: "Greycliff CF, sans-serif" }}
          >
            Set New Password
          </Title>
          <Text c="dimmed" size="sm" ta="center" mt={5}>
            Please enter your new password below
          </Text>

          <Paper withBorder shadow="md" p={30} mt={30} radius="md">
            <Stack>
              <PasswordInput
                label="New Password"
                placeholder="Your new password"
                required
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
              <Button
                fullWidth
                onClick={handleUpdate}
                loading={loading}
                style={{ backgroundColor: "#1A237E" }}
              >
                Update Password
              </Button>
            </Stack>
          </Paper>
        </Container>
      </Center>

      <SiteFooter />
    </Box>
  );
}
