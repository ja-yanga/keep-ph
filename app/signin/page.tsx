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
} from "@mantine/core";
import { useRouter } from "next/navigation";
import Nav from "../../components/Nav";
import SiteFooter from "../../components/Footer";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/components/SessionProvider";

export default function SignInPage() {
  const router = useRouter();
  const { refresh } = useSession(); // Get the refresh function
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // <-- required for Set-Cookie to be stored by browser
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Signin failed");
        return;
      }

      // client supabase also holds session; optional fetch:
      await supabase.auth.getSession();

      // Force the session provider to update before redirecting
      await refresh();

      // if backend indicates onboarding required, redirect there first
      if (data?.needsOnboarding) {
        router.push("/onboarding");
        return;
      }

      // otherwise go to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#F5F6FA",
        fontFamily: "Manrope, sans-serif",
        color: "#1A237E",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Nav />

      {/* Main Section - styled to match signup */}
      <Center style={{ flex: 1, paddingTop: 48, paddingBottom: 96 }}>
        <Container size={520}>
          {" "}
          {/* Changed from 420 */}
          <Stack align="center" gap="md">
            <Title order={1} style={{ fontWeight: 700, color: "#1A237E" }}>
              Login
            </Title>
            <Text c="#6B7280" size="lg">
              Sign in to access your account
            </Text>
          </Stack>
          <Box mt="xl">
            <Paper
              withBorder
              shadow="md"
              p="xl"
              radius="xl"
              style={{ width: "100%" }} /* ensures same width as signup */
            >
              <form onSubmit={handleSubmit}>
                <Stack gap="md">
                  <TextInput
                    label="Email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <PasswordInput
                    label="Password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Box style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Anchor
                      href="#"
                      style={{
                        color: "#1A237E",
                        fontWeight: 500,
                        fontSize: 14,
                      }}
                    >
                      Forgot Password?
                    </Anchor>
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    disabled={loading}
                    style={{
                      height: 48,
                      backgroundColor: "#1A237E",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </Stack>
              </form>

              <Center mt="md">
                <Text size="sm" c="#6B7280">
                  Don't have an account?{" "}
                  <Anchor
                    href="/signup"
                    style={{ color: "#1A237E", fontWeight: 500 }}
                  >
                    Sign Up
                  </Anchor>
                </Text>
              </Center>
            </Paper>
          </Box>
        </Container>
      </Center>

      <SiteFooter />
    </Box>
  );
}
