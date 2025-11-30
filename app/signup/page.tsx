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
  rem,
} from "@mantine/core";
import { IconAlertCircle, IconAt, IconLock } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import Nav from "../../components/Nav";
import SiteFooter from "../../components/Footer";

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Signup failed");
        setLoading(false);
        return;
      }

      // On successful signup redirect to signin
      router.push("/signin");
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
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
      {/* Header */}
      <Nav />

      {/* Main Section */}
      <Center style={{ flex: 1, padding: "4rem 1rem" }}>
        <Container size="xs" w="100%">
          <Stack gap="lg">
            <Stack gap={4} align="center">
              <Title
                order={1}
                ta="center"
                style={{
                  fontWeight: 800,
                  color: "#1A237E",
                  fontSize: rem(32),
                }}
              >
                Create Account
              </Title>
              <Text c="dimmed" size="md" ta="center">
                Join Keep PH and manage your mail from anywhere.
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
                      title="Registration Error"
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
                    error={!!error && error.includes("email")}
                    size="md"
                    radius="md"
                    leftSection={<IconAt size={16} color="#868e96" />}
                  />
                  <PasswordInput
                    label="Password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={!!error && error.includes("Password")}
                    size="md"
                    radius="md"
                    leftSection={<IconLock size={16} color="#868e96" />}
                  />
                  <PasswordInput
                    label="Confirm Password"
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={!!error && error.includes("match")}
                    size="md"
                    radius="md"
                    leftSection={<IconLock size={16} color="#868e96" />}
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
                    Sign Up
                  </Button>
                </Stack>
              </form>

              <Text ta="center" mt="xl" size="sm" c="dimmed">
                Already have an account?{" "}
                <Anchor href="/signin" fw={600} c="#1A237E">
                  Log In
                </Anchor>
              </Text>
            </Paper>
          </Stack>
        </Container>
      </Center>

      {/* Footer */}
      <SiteFooter />
    </Box>
  );
}
