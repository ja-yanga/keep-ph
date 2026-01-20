"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Center,
  Alert,
  Group,
  rem,
  Loader,
  Divider,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconAt,
  IconLock,
  IconCheck,
  IconBrandGoogle,
} from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/SessionProvider";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { startRouteProgress } from "@/lib/route-progress";
import Link from "next/link";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ACCESSIBILITY COLORS: Slate 700 (#4A5568) ensures a 6.2:1 contrast ratio
  const colors = {
    primaryBlue: "#1A237E",
    textSecondary: "#4A5568",
    iconGray: "#4A5568",
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const [verified, setVerified] = useState(false);
  const [pwReset, setPwReset] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=signup")) {
      setVerified(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (searchParams.get("pw_reset") === "1") {
      setPwReset(true);
      router.replace("/signin");
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    startRouteProgress();
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(API_ENDPOINTS.auth.signin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Signin failed");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      await supabase.auth.getSession();
      await refresh();

      if (next) {
        router.push(next);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${
            window.location.origin
          }/api/auth/callback/google?next=${next || "/dashboard"}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setOauthLoading(false);
    }
  };

  return (
    /* LANDMARK FIX: Wrapped content in <main> for screen readers */
    <main role="main" aria-label="Login form">
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
                Login
              </Title>
              {/* CONTRAST FIX: Replaced c="dimmed" */}
              <Text style={{ color: colors.textSecondary }} size="md">
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
                  {verified && (
                    <Alert
                      variant="light"
                      color="teal"
                      title="Email Verified"
                      icon={<IconCheck size={16} />}
                      radius="md"
                    >
                      Your email has been successfully verified. Please log in.
                    </Alert>
                  )}
                  {pwReset && (
                    <Alert
                      variant="light"
                      color="teal"
                      title="Password Updated"
                      icon={<IconCheck size={16} />}
                      radius="md"
                    >
                      Your password was updated. Please sign in with your new
                      password.
                    </Alert>
                  )}

                  {error && (
                    <Alert
                      variant="light"
                      color="red"
                      title="Account Issue"
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
                    leftSection={<IconAt size={16} color={colors.iconGray} />}
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
                      leftSection={
                        <IconLock size={16} color={colors.iconGray} />
                      }
                    />
                    <Group justify="flex-end">
                      <Link
                        href="/forgot-password"
                        onClick={() => startRouteProgress()}
                        style={{
                          fontWeight: 600,
                          color: colors.primaryBlue,
                          textDecoration: "none",
                          fontSize: ".8rem",
                        }}
                      >
                        Forgot Password?
                      </Link>
                    </Group>
                  </Stack>

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
                    Sign In
                  </Button>

                  {/* CONTRAST FIX: Replaced dimmed divider label */}
                  <Divider
                    label={
                      <Text
                        style={{ color: colors.textSecondary, fontWeight: 600 }}
                      >
                        Or continue with
                      </Text>
                    }
                    labelPosition="center"
                    my="xs"
                  />

                  <Button
                    variant="default"
                    fullWidth
                    size="md"
                    radius="md"
                    loading={oauthLoading}
                    disabled={loading}
                    leftSection={<IconBrandGoogle size={18} />}
                    onClick={handleGoogleLogin}
                    type="button"
                  >
                    Sign in with Google
                  </Button>
                </Stack>
              </form>

              {/* CONTRAST FIX: Replaced c="dimmed" */}
              <Text
                ta="center"
                mt="xl"
                size="sm"
                style={{ color: colors.textSecondary }}
              >
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  onClick={() => startRouteProgress()}
                  style={{
                    fontWeight: 600,
                    color: colors.primaryBlue,
                    textDecoration: "none",
                  }}
                >
                  Sign Up
                </Link>
              </Text>
            </Paper>
          </Stack>
        </Container>
      </Center>
    </main>
  );
}

export default function SignInForm() {
  return (
    <Suspense fallback={<Loader />}>
      <SignInContent />
    </Suspense>
  );
}
