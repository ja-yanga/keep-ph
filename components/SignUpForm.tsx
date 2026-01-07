"use client";

import { useState, useEffect } from "react";
import {
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
  ThemeIcon,
  Divider,
  Popover,
  Progress,
  Group,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconAt,
  IconLock,
  IconMail,
  IconCheck,
  IconBrandGoogle,
  IconX,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

export default function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popoverOpened, setPopoverOpened] = useState(false);

  // Auto-hide error alert
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Password Strength Logic
  const checks = [
    { label: "Includes at least 6 characters", meets: password.length > 5 },
    { label: "Includes number", meets: /[0-9]/.test(password) },
    { label: "Includes lowercase letter", meets: /[a-z]/.test(password) },
    { label: "Includes uppercase letter", meets: /[A-Z]/.test(password) },
  ];
  const strength = checks.reduce(
    (acc, requirement) => (!requirement.meets ? acc : acc + 1),
    0,
  );
  let color: string;
  if (strength === 4) {
    color = "teal";
  } else if (strength > 2) {
    color = "yellow";
  } else {
    color = "red";
  }

  // New state to toggle between Form and Verification View
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Resend Logic State
  const [timer, setTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    if (strength < 4) {
      setError("Password is too weak");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.auth.signup, {
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

      // Instead of redirecting, show the verification UI
      setIsSubmitted(true);
      setTimer(60); // Start cooldown immediately after signup
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // --- Google OAuth (copied from signin) ---
  const handleGoogleSignUp = async () => {
    setOauthLoading(true);
    setError(null);
    // Create a temporary client to ensure PKCE flow is used
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Point to the Google callback for signup flow
          redirectTo: `${window.location.origin}/api/auth/callback/google?type=signup`,
        },
      });
      if (error) throw error;
      // browser will redirect
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setOauthLoading(false);
    }
  };
  // --- end Google OAuth ---

  const handleResend = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const res = await fetch(API_ENDPOINTS.auth.resend, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setResendSuccess(true);
        setTimer(60); // Reset timer to 60 seconds
      } else {
        // Handle error silently or show a small notification
        console.error("Failed to resend");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setResendLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // VIEW: Verification / Check Email
  // ----------------------------------------------------------------
  if (isSubmitted) {
    return (
      <Center style={{ flex: 1, padding: "4rem 1rem" }}>
        <Container size="sm">
          <Stack align="center" gap="xl">
            {/* Icon */}
            <ThemeIcon
              size={80}
              radius="50%"
              variant="light"
              color="indigo"
              style={{ backgroundColor: "#E8EAF6" }}
            >
              <IconMail size={40} color="#1A237E" />
            </ThemeIcon>

            {/* Headings */}
            <Stack gap="xs" align="center">
              <Title
                order={1}
                style={{
                  fontWeight: 800,
                  color: "#1A237E",
                  fontSize: rem(32),
                }}
              >
                Check Your Email
              </Title>
              <Text c="dimmed" ta="center" maw={400}>
                We&apos;ve sent a verification link to <b>{email}</b>. Please
                click the link to activate your account.
              </Text>
            </Stack>

            {/* Action Card */}
            <Paper
              withBorder
              shadow="sm"
              p={30}
              radius="md"
              style={{
                backgroundColor: "#fff",
                borderColor: "#E9ECEF",
                width: "100%",
                maxWidth: 400,
              }}
            >
              <Stack align="center" gap="md">
                {/* Success Alert */}
                {resendSuccess && (
                  <Alert
                    variant="light"
                    color="teal"
                    title="Email Sent"
                    icon={<IconCheck size={16} />}
                    withCloseButton
                    onClose={() => setResendSuccess(false)}
                    w="100%"
                  >
                    A new verification link has been sent.
                  </Alert>
                )}

                <Text
                  size="sm"
                  c="dimmed"
                  ta="center"
                  style={{ lineHeight: 1.5 }}
                >
                  Didn&apos;t receive the email? Check your spam folder or click
                  the button below to send it again.
                </Text>

                <Button
                  variant="outline"
                  fullWidth
                  size="md"
                  radius="md"
                  color="indigo"
                  loading={resendLoading}
                  disabled={timer > 0}
                  style={{
                    borderColor: "#1A237E",
                    color: "#1A237E",
                    fontWeight: 600,
                  }}
                  onClick={handleResend}
                >
                  {timer > 0 ? `Resend available in ${timer}s` : "Resend Email"}
                </Button>

                <Anchor href="/signin" size="sm" c="dimmed" mt="xs">
                  Back to Login
                </Anchor>
              </Stack>
            </Paper>
          </Stack>
        </Container>
      </Center>
    );
  }

  // ----------------------------------------------------------------
  // VIEW: Sign Up Form (Default)
  // ----------------------------------------------------------------
  return (
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
                    title="Registration Issue"
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
                <Popover
                  opened={popoverOpened}
                  position="bottom"
                  width="target"
                  transitionProps={{ transition: "pop" }}
                >
                  <Popover.Target>
                    <div
                      onFocusCapture={() => setPopoverOpened(true)}
                      onBlurCapture={() => setPopoverOpened(false)}
                    >
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
                    </div>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Progress
                      color={color}
                      value={(strength * 100) / 4}
                      mb={10}
                      size={7}
                    />
                    {checks.map((requirement, index) => (
                      <Group key={index} gap={10} mt={7}>
                        {requirement.meets ? (
                          <IconCheck
                            style={{ width: rem(14), height: rem(14) }}
                            color="var(--mantine-color-teal-filled)"
                          />
                        ) : (
                          <IconX
                            style={{ width: rem(14), height: rem(14) }}
                            color="var(--mantine-color-red-filled)"
                          />
                        )}
                        <Text size="sm" c={requirement.meets ? "teal" : "red"}>
                          {requirement.label}
                        </Text>
                      </Group>
                    ))}
                  </Popover.Dropdown>
                </Popover>
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
                  disabled={loading}
                  leftSection={<IconBrandGoogle size={18} />}
                  onClick={handleGoogleSignUp}
                  type="button"
                >
                  Continue with Google
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
  );
}
