"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Title,
  Text,
  Paper,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Anchor,
  Center,
  Alert,
  Group,
  rem,
} from "@mantine/core";
import { IconAlertCircle, IconAt, IconLock } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "../../components/Nav";
import SiteFooter from "../../components/Footer";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/components/SessionProvider";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next"); // Get the return URL if it exists

  const { refresh } = useSession(); // Get the refresh function
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Add error state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null); // Clear previous errors

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // <-- required for Set-Cookie to be stored by browser
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Signin failed"); // Set error state instead of alert
        setLoading(false);
        return;
      }

      // client supabase also holds session; optional fetch:
      await supabase.auth.getSession();

      // Force the session provider to update before redirecting
      await refresh();

      // 1. Priority: API mandated redirect (e.g. onboarding)
      if (data?.redirectTo) {
        router.push(data.redirectTo);
        return;
      }

      // 2. Priority: User intended destination (from middleware redirect)
      if (next) {
        router.push(next);
        return;
      }

      // 3. Default: Dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again."); // Set error state
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#F8F9FA",
        fontFamily: "Manrope, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Nav />

      <Center style={{ flex: 1, padding: "4rem 1rem" }}>
        <Container size="xs" w="100%">
          <Stack gap="lg">
            <Stack gap={4} align="center">
              <Title
                order={1}
                style={{
                  fontWeight: 800,
                  color: "#1A237E",
                  fontSize: rem(32),
                }}
              >
                Login
              </Title>
              <Text c="dimmed" size="md">
                Sign in to access your account
              </Text>
            </Stack>

            <Paper
              withBorder
              shadow="xl"
              p={30}
              radius="md"
              style={{ backgroundColor: "#fff", borderColor: "#E9ECEF" }}
            >
              <form onSubmit={handleSubmit}>
                <Stack gap="md">
                  {error && (
                    <Alert
                      variant="light"
                      color="red"
                      title="Authentication Error"
                      icon={<IconAlertCircle size={16} />}
                      radius="md"
                    >
                      {error}
                    </Alert>
                  )}

                  <TextInput
                    label="Email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!error}
                    size="md"
                    radius="md"
                    leftSection={<IconAt size={16} color="#868e96" />}
                  />

                  <Stack gap={4}>
                    <PasswordInput
                      label="Password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={!!error}
                      size="md"
                      radius="md"
                      leftSection={<IconLock size={16} color="#868e96" />}
                    />
                    <Group justify="flex-end">
                      <Anchor href="#" size="sm" fw={500} c="#1A237E">
                        Forgot Password?
                      </Anchor>
                    </Group>
                  </Stack>

                  <Button
                    type="submit"
                    fullWidth
                    size="md"
                    radius="md"
                    loading={loading}
                    style={{
                      backgroundColor: "#1A237E",
                      fontWeight: 600,
                    }}
                  >
                    Sign In
                  </Button>
                </Stack>
              </form>

              <Text ta="center" mt="xl" size="sm" c="dimmed">
                Don't have an account?{" "}
                <Anchor href="/signup" fw={600} c="#1A237E">
                  Sign Up
                </Anchor>
              </Text>
            </Paper>
          </Stack>
        </Container>
      </Center>

      <SiteFooter />
    </Box>
  );
}
