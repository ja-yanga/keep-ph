"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  TextInput,
  Button,
  Center,
  Alert,
  rem,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconAt,
  IconMail,
  IconArrowLeft,
} from "@tabler/icons-react";
import Link from "next/link";
import { startRouteProgress } from "@/lib/route-progress";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ACCESSIBILITY COLORS: Slate 700 (#4A5568) ensures a 6.2:1 contrast ratio against white
  const colors = {
    primaryBlue: "#1A237E",
    textSecondary: "#4A5568",
    iconGray: "#4A5568",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to send reset link");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* LANDMARK FIX: Wrapped in <main> for screen reader navigation */
    <main role="main" aria-label="Forgot password form">
      <Center style={{ flex: 1, padding: "4rem 1rem" }}>
        <Container size="xs" w="100%">
          <Stack gap="lg">
            <Stack gap={4} align="center">
              <Title
                order={1}
                style={{
                  fontWeight: 800,
                  color: colors.primaryBlue,
                  fontSize: rem(32),
                }}
              >
                Reset Password
              </Title>
              {/* CONTRAST FIX: Replaced c="dimmed" with high-contrast color */}
              <Text
                style={{ color: colors.textSecondary }}
                size="md"
                ta="center"
              >
                Enter your email to receive a reset link
              </Text>
            </Stack>

            <Paper
              withBorder
              shadow="xl"
              p={30}
              radius="md"
              style={{ backgroundColor: "#fff", borderColor: "#E9ECEF" }}
            >
              {success ? (
                <Stack align="center" gap="md">
                  <ThemeIcon
                    size={60}
                    radius="50%"
                    color="teal"
                    variant="light"
                  >
                    <IconMail size={30} />
                  </ThemeIcon>
                  <Text ta="center" fw={500}>
                    Check your email
                  </Text>
                  {/* CONTRAST FIX: Replaced c="dimmed" */}
                  <Text
                    ta="center"
                    size="sm"
                    style={{ color: colors.textSecondary }}
                  >
                    We have sent a password reset link to <b>{email}</b>.
                  </Text>
                  <Button
                    variant="subtle"
                    onClick={() => setSuccess(false)}
                    size="sm"
                    color="indigo"
                  >
                    Try a different email
                  </Button>
                </Stack>
              ) : (
                <form onSubmit={handleSubmit}>
                  <Stack gap="md">
                    {error && (
                      <Alert
                        variant="light"
                        color="red"
                        title="Error"
                        icon={<IconAlertCircle size={16} />}
                        radius="md"
                      >
                        {error}
                      </Alert>
                    )}

                    <TextInput
                      label="Email"
                      placeholder="user@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      size="md"
                      radius="md"
                      /* CONTRAST FIX: Icon color updated to Slate 700 */
                      leftSection={<IconAt size={16} color={colors.iconGray} />}
                    />

                    <Button
                      type="submit"
                      fullWidth
                      size="md"
                      radius="md"
                      loading={loading}
                      style={{
                        backgroundColor: colors.primaryBlue,
                        fontWeight: 600,
                      }}
                    >
                      Send Reset Link
                    </Button>
                  </Stack>
                </form>
              )}

              <Center mt="xl">
                {/* CONTRAST FIX: Replaced c="dimmed" with textSecondary */}
                <Link
                  href="/signin"
                  onClick={() => startRouteProgress()}
                  style={{
                    color: colors.textSecondary,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontWeight: 500,
                    textDecoration: "none",
                    fontSize: ".9rem",
                  }}
                >
                  <IconArrowLeft size={14} /> Back to Login
                </Link>
              </Center>
            </Paper>
          </Stack>
        </Container>
      </Center>
    </main>
  );
}
