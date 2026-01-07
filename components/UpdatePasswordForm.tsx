"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Button,
  PasswordInput,
  Paper,
  Title,
  Container,
  Stack,
  Text,
  Loader,
  Center,
  Popover,
  Progress,
  Group,
  rem,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

export default function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
  const router = useRouter();

  const supabase = createClient();

  useEffect(() => {
    const initSession = async () => {
      // Check if a session already exists
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setVerifying(false);
        return;
      }

      // If no session, check for recovery tokens in URL hash
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.replace("#", ""));
        const access_token = params.get("access_token")!;
        const refresh_token = params.get("refresh_token")!;

        // Set session manually
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          notifications.show({
            title: "Invalid or expired link",
            message: "Please request a new password reset link.",
            color: "red",
          });
          router.push("/signin");
          return;
        }

        // Clean URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
        setVerifying(false);
        return;
      }

      // If no session and no token
      notifications.show({
        title: "Session Expired",
        message: "Please request a new password reset link.",
        color: "red",
      });
      router.push("/signin");
    };

    initSession();
  }, [supabase, router]);

  const handleUpdate = async () => {
    setSubmitted(true);
    if (!password || !confirmPassword) return;
    if (password !== confirmPassword) {
      notifications.show({
        title: "Error",
        message: "Passwords do not match",
        color: "red",
      });
      return;
    }
    if (strength < 4) {
      notifications.show({
        title: "Error",
        message: "Password is too weak",
        color: "red",
      });
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } else {
      // sign out current session so middleware won't redirect an authenticated user
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.debug("signOut failed (ignored):", e);
      }
      // navigate to signin with flag to show confirmation
      router.push("/signin?pw_reset=1");
    }

    setLoading(false);
  };

  const getPasswordError = () => {
    if (!submitted) return null;
    if (!password) return "Password is required";
    if (strength < 4) return "Password is too weak";
    return null;
  };

  const getConfirmPasswordError = () => {
    if (!submitted) return null;
    if (!confirmPassword) return "Please confirm your password";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  };

  if (verifying) {
    return (
      <Center style={{ flex: 1 }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Center style={{ flex: 1, padding: "40px 0" }}>
      <Container size={420} w="100%">
        <Title
          ta="center"
          order={2}
          style={{ fontFamily: "Greycliff CF, sans-serif" }}
        >
          Set New Password
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          Please enter your new password below
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Stack>
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
                    label="New Password"
                    placeholder="Your new password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    error={getPasswordError()}
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
              placeholder="Confirm your new password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              error={getConfirmPasswordError()}
            />
            <Button
              fullWidth
              onClick={handleUpdate}
              loading={loading}
              style={{ backgroundColor: "#1A237E" }}
            >
              Update Password
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Center>
  );
}
