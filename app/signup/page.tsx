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

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }
    if (password.length < 8) {
      alert("Password must be at least 8 characters long");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match");
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
        alert(data?.error || "Signup failed");
        setLoading(false);
        return;
      }

      // On successful signup redirect to signin
      router.push("/signin");
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
      {/* Header */}
      <Nav />

      {/* Main Section */}
      <Center style={{ flex: 1, paddingTop: 48, paddingBottom: 96 }}>
        <Container size={520}>
          <Stack align="center" gap="md">
            <Title
              order={1}
              ta="center"
              style={{ fontWeight: 700, color: "#1A237E" }}
            >
              Create Your Account
            </Title>
            <Text c="#6B7280" size="lg" ta="center">
              Join Keep PH and manage your mail from anywhere.
            </Text>
          </Stack>

          <Box mt="xl">
            <Paper withBorder shadow="md" p="xl" radius="xl">
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
                  <PasswordInput
                    label="Confirm Password"
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
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
                    {loading ? "Signing up..." : "Sign Up"}
                  </Button>
                </Stack>
              </form>

              <Center mt="md">
                <Text size="sm" c="#6B7280">
                  Already have an account?{" "}
                  <Anchor
                    href="/signin"
                    style={{ color: "#1A237E", fontWeight: 500 }}
                  >
                    Log In
                  </Anchor>
                </Text>
              </Center>
            </Paper>
          </Box>
        </Container>
      </Center>

      {/* Footer */}
      <SiteFooter />
    </Box>
  );
}
