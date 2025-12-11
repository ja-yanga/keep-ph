"use client";

import { useState, Suspense, useEffect } from "react";
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
import Nav from "../../components/Nav";
import SiteFooter from "../../components/Footer";
import { supabase } from "@/lib/supabaseClient";
import { createBrowserClient } from "@supabase/ssr";
import { useSession } from "@/components/SessionProvider";

// 1. Move the main logic into a separate component
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

  // NEW: State for verification alert
  const [verified, setVerified] = useState(false);
  // NEW: State for password-reset success alert
  const [pwReset, setPwReset] = useState(false);

  // NEW: Check URL hash for implicit flow verification
  useEffect(() => {
    // The URL will look like: /signin#access_token=...&type=signup...
    const hash = window.location.hash;
    if (hash && hash.includes("type=signup")) {
      setVerified(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
    // Check query param for password reset success
    if (searchParams.get("pw_reset") === "1") {
      setPwReset(true);
      // remove query so it won't re-show on refresh
      router.replace("/signin");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signin", {
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

      await supabase.auth.getSession();
      await refresh();

      // Client decides onboarding redirect by fetching profile (fast) after login
      const profRes = await fetch("/api/user/profile", {
        credentials: "include",
      });
      const profJson = await profRes.json().catch(() => null);
      const needsOnboarding = profJson?.needsOnboarding ?? false;

      if (needsOnboarding) {
        router.push("/onboarding");
        return;
      }
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

  // NEW: Google Login Handler
  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    setError(null);

    // NEW: Create a temporary client to ensure PKCE flow is used
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // CHANGED: Point to the specific Google callback
          redirectTo: `${
            window.location.origin
          }/api/auth/callback/google?next=${next || "/dashboard"}`,
        },
      });
      if (error) throw error;
      // Note: No need to setLoading(false) as the browser will redirect
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setOauthLoading(false);
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
                  {/* NEW: Verification Success Alert */}
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
                      <Anchor
                        href="/forgot-password"
                        size="sm"
                        fw={500}
                        c="#1A237E"
                      >
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

                  {/* NEW: Google Login Section */}
                  <Divider
                    label="Or continue with"
                    labelPosition="center"
                    my="xs"
                  />

                  <Button
                    variant="default"
                    fullWidth
                    size="md"
                    radius="md"
                    loading={oauthLoading}
                    leftSection={<IconBrandGoogle size={18} />}
                    onClick={handleGoogleLogin}
                    type="button"
                  >
                    Sign in with Google
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

// 2. Export the wrapper component with Suspense
export default function SignInPage() {
  return (
    <Suspense fallback={<Loader />}>
      <SignInContent />
    </Suspense>
  );
}
