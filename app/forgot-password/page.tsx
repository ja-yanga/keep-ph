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
  Button,
  Anchor,
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
import Nav from "../../components/Nav";
import SiteFooter from "../../components/Footer";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
                Reset Password
              </Title>
              <Text c="dimmed" size="md" ta="center">
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
                  <Text ta="center" size="sm" c="dimmed">
                    We have sent a password reset link to <b>{email}</b>.
                  </Text>
                  <Button
                    variant="subtle"
                    onClick={() => setSuccess(false)}
                    size="sm"
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
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      size="md"
                      radius="md"
                      leftSection={<IconAt size={16} color="#868e96" />}
                    />

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
                      Send Reset Link
                    </Button>
                  </Stack>
                </form>
              )}

              <Center mt="xl">
                <Anchor
                  href="/signin"
                  size="sm"
                  c="dimmed"
                  display="flex"
                  style={{ alignItems: "center", gap: 5 }}
                >
                  <IconArrowLeft size={14} /> Back to Login
                </Anchor>
              </Center>
            </Paper>
          </Stack>
        </Container>
      </Center>

      <SiteFooter />
    </Box>
  );
}
