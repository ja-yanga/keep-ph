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

  // FIX: High-Contrast Color Palette (WCAG AA Compliant)
  const colors = {
    textDark: "#1A202C", // Main text (Contrast 16.5:1)
    textMuted: "#4A5568", // Secondary text (Contrast 6.2:1 - replaces failing #495057)
    primaryBlue: "#1A237E",
    iconColor: "#4A5568",
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
  if (strength === 4) color = "teal";
  else if (strength > 2) color = "yellow";
  else color = "red";

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

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
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Signup failed");
        setLoading(false);
        return;
      }

      setIsSubmitted(true);
      setTimer(60);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setOauthLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback/google?type=signup`,
        },
      });
      if (authError) throw authError;
    } catch {
      setError("An unexpected error occurred.");
      setOauthLoading(false);
    }
  };

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
        setTimer(60);
      }
    } catch {
      console.error("Failed to resend email");
    } finally {
      setResendLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <main role="main" aria-label="Sign up verification">
        <Center style={{ flex: 1, padding: "4rem 1rem" }}>
          <Container size="sm">
            <Stack align="center" gap="xl">
              <ThemeIcon
                size={80}
                radius="50%"
                variant="light"
                color="indigo"
                style={{ backgroundColor: "#E8EAF6" }}
              >
                <IconMail size={40} color={colors.primaryBlue} />
              </ThemeIcon>

              <Stack gap="xs" align="center">
                <Title
                  order={1}
                  style={{
                    fontWeight: 800,
                    color: colors.primaryBlue,
                    fontSize: rem(32),
                  }}
                >
                  Check Your Email
                </Title>
                <Text style={{ color: colors.textDark }} ta="center" maw={400}>
                  We&apos;ve sent a verification link to <b>{email}</b>. Please
                  click the link to activate your account.
                </Text>
              </Stack>

              <Paper
                withBorder
                shadow="sm"
                p={30}
                radius="md"
                style={{
                  backgroundColor: "#F8FAFC",
                  borderColor: "#DCE6F2",
                  color: colors.textDark,
                  width: "100%",
                  maxWidth: 400,
                }}
              >
                <Stack align="center" gap="md">
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
                    style={{ color: colors.textMuted, lineHeight: 1.5 }}
                    ta="center"
                  >
                    Didn&apos;t receive the email? Check your spam folder or
                    click the button below to send it again.
                  </Text>

                  <Button
                    variant="outline"
                    fullWidth
                    size="md"
                    radius="md"
                    color="indigo"
                    loading={resendLoading}
                    disabled={timer > 0}
                    onClick={handleResend}
                    style={{
                      borderColor: colors.primaryBlue,
                      color: colors.primaryBlue,
                      fontWeight: 600,
                    }}
                  >
                    {timer > 0
                      ? `Resend available in ${timer}s`
                      : "Resend Email"}
                  </Button>

                  <Anchor
                    href="/signin"
                    size="sm"
                    style={{ color: colors.textMuted }}
                    mt="xs"
                  >
                    Back to Login
                  </Anchor>
                </Stack>
              </Paper>
            </Stack>
          </Container>
        </Center>
      </main>
    );
  }

  return (
    <main role="main" aria-label="Sign up form">
      <Center style={{ flex: 1, padding: "4rem 1rem" }}>
        <Container size="xs" w="100%">
          <Stack gap="lg">
            <Stack gap={4} align="center">
              <Title
                order={1}
                ta="center"
                style={{
                  fontWeight: 800,
                  color: colors.primaryBlue,
                  fontSize: rem(32),
                }}
              >
                Create Account
              </Title>
              <Text size="md" ta="center" style={{ color: colors.textMuted }}>
                Join Keep PH and manage your mail from anywhere.
              </Text>
            </Stack>

            <Paper
              withBorder
              shadow="xl"
              p={30}
              radius="md"
              style={{
                backgroundColor: "#F8FAFC",
                borderColor: "#DCE6F2",
                color: colors.textDark,
              }}
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
                    aria-required="true"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!error && error.includes("email")}
                    size="md"
                    radius="md"
                    leftSection={<IconAt size={16} color={colors.iconColor} />}
                  />

                  <Popover
                    opened={popoverOpened}
                    position="bottom"
                    width="target"
                    transitionProps={{ transition: "pop" }}
                  >
                    <Popover.Target>
                      {/* FIX: Use role="combobox" and aria-label to make aria-haspopup and aria-expanded 
                          valid on the wrapper div, resolving the Lighthouse role mismatch error.
                      */}
                      <div
                        role="combobox"
                        aria-haspopup="dialog"
                        aria-label="Password requirements"
                        style={{ width: "100%" }}
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
                          leftSection={
                            <IconLock size={16} color={colors.iconColor} />
                          }
                          aria-describedby="password-requirements"
                          onFocus={() => setPopoverOpened(true)}
                          onBlur={() => setPopoverOpened(false)}
                        />
                      </div>
                    </Popover.Target>
                    <Popover.Dropdown id="password-requirements">
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
                          <Text
                            size="sm"
                            c={requirement.meets ? "teal.9" : "red.9"}
                            fw={500}
                          >
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
                    leftSection={
                      <IconLock size={16} color={colors.iconColor} />
                    }
                  />

                  <Button
                    type="submit"
                    aria-label="Create account"
                    fullWidth
                    size="md"
                    radius="md"
                    loading={loading}
                    style={{
                      backgroundColor: colors.primaryBlue,
                      fontWeight: 600,
                    }}
                  >
                    Sign Up
                  </Button>

                  <Divider
                    label={
                      <Text
                        style={{ color: colors.textMuted, fontWeight: 600 }}
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
                    onClick={handleGoogleSignUp}
                    type="button"
                    aria-label="Continue with Google"
                  >
                    Continue with Google
                  </Button>
                </Stack>
              </form>

              <Text
                ta="center"
                mt="xl"
                size="sm"
                style={{ color: colors.textMuted }}
              >
                Already have an account?{" "}
                <Anchor href="/signin" fw={600} c={colors.primaryBlue}>
                  Log In
                </Anchor>
              </Text>
            </Paper>
          </Stack>
        </Container>
      </Center>
    </main>
  );
}
