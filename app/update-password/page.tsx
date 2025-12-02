"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Title,
  Text,
  Paper,
  Stack,
  PasswordInput,
  Button,
  Center,
  Alert,
  rem,
} from "@mantine/core";
import { IconAlertCircle, IconLock, IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import Nav from "../../components/Nav";
import SiteFooter from "../../components/Footer";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Extract access_token from URL hash (Implicit Flow)
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1)); // remove #
      const token = params.get("access_token");
      if (token) {
        setAccessToken(token);
      } else {
        setError("Invalid or expired reset link.");
      }
    } else {
      // If no hash, maybe the user is already logged in via cookie?
      // We'll let the API decide, or show an error if strictly relying on hash.
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // CHANGED: Use the new dedicated reset-password API
      const headers: HeadersInit = { "Content-Type": "application/json" };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update password");
      }

      setSuccess(true);

      setTimeout(() => {
        router.push("/signin");
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update password");
    } finally {
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
                style={{ fontWeight: 800, color: "#1A237E", fontSize: rem(32) }}
              >
                New Password
              </Title>
              <Text c="dimmed" size="md">
                Enter your new secure password
              </Text>
            </Stack>

            <Paper
              withBorder
              shadow="xl"
              p={30}
              radius="md"
              style={{ backgroundColor: "#fff" }}
            >
              {success ? (
                <Alert
                  variant="light"
                  color="teal"
                  title="Success"
                  icon={<IconCheck size={16} />}
                  radius="md"
                >
                  Password updated successfully! Redirecting to login...
                </Alert>
              ) : (
                <form onSubmit={handleSubmit}>
                  <Stack gap="md">
                    {error && (
                      <Alert
                        color="red"
                        icon={<IconAlertCircle size={16} />}
                        radius="md"
                      >
                        {error}
                      </Alert>
                    )}

                    <PasswordInput
                      label="New Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      radius="md"
                      leftSection={<IconLock size={16} color="#868e96" />}
                    />
                    <PasswordInput
                      label="Confirm Password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      radius="md"
                      leftSection={<IconLock size={16} color="#868e96" />}
                    />

                    <Button
                      type="submit"
                      fullWidth
                      size="md"
                      radius="md"
                      loading={loading}
                      style={{ backgroundColor: "#1A237E" }}
                    >
                      Update Password
                    </Button>
                  </Stack>
                </form>
              )}
            </Paper>
          </Stack>
        </Container>
      </Center>
      <SiteFooter />
    </Box>
  );
}
