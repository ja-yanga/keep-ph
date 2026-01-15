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
  Box,
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

  const router = useRouter();
  const supabase = createClient();

  // Password Strength Logic
  const checks = [
    { label: "Includes at least 6 characters", meets: password.length > 5 },
    { label: "Includes number", meets: /[0-9]/.test(password) },
    { label: "Includes lowercase letter", meets: /[a-z]/.test(password) },
    { label: "Includes uppercase letter", meets: /[A-Z]/.test(password) },
  ];

  const strength = checks.reduce((acc, req) => (!req.meets ? acc : acc + 1), 0);

  // Logic for color without nested ternaries
  let progressColor = "red";
  if (strength === 4) progressColor = "teal";
  else if (strength > 2) progressColor = "yellow";

  useEffect(() => {
    const initSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setVerifying(false);
        return;
      }

      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.replace("#", ""));
        const access_token = params.get("access_token")!;
        const refresh_token = params.get("refresh_token")!;

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

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
        setVerifying(false);
        return;
      }

      notifications.show({
        title: "Session Expired",
        message: "Please request a new password reset link.",
        color: "red",
      });
      router.push("/signin");
    };

    initSession();
  }, [supabase, router]);

  // DERIVED ERROR LOGIC (No nested ternaries)
  const getPasswordErrorMessage = () => {
    if (!submitted) return null;
    if (!password) return "Password is required";
    if (strength < 4) return "Password is too weak";
    return null;
  };

  const getConfirmErrorMessage = () => {
    if (!submitted) return null;
    if (!confirmPassword) return "Please confirm your password";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleUpdate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitted(true);

    if (!password || !confirmPassword) return;
    if (password !== confirmPassword) return; // Notification already handled by visual error
    if (strength < 4) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } else {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.debug(err);
      }
      router.push("/signin?pw_reset=1");
    }
    setLoading(false);
  };

  if (verifying) {
    return (
      <Center style={{ flex: 1 }}>
        <Loader size="lg" aria-label="Verifying your reset session" />
      </Center>
    );
  }

  return (
    <Center style={{ flex: 1, padding: "40px 0" }}>
      <Container size={420} w="100%">
        <Title
          ta="center"
          order={1}
          size="h2"
          style={{ fontFamily: "Greycliff CF, sans-serif" }}
        >
          Set New Password
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          Please enter your new password below
        </Text>

        <Paper
          withBorder
          shadow="md"
          p={30}
          mt={30}
          radius="md"
          component="form"
          onSubmit={handleUpdate}
        >
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
                    error={getPasswordErrorMessage()}
                    aria-invalid={submitted && strength < 4}
                    aria-describedby="password-requirements-hint"
                  />
                </div>
              </Popover.Target>
              <Popover.Dropdown>
                <Box id="password-requirements-hint" aria-live="polite">
                  <Progress
                    color={progressColor}
                    value={(strength * 100) / 4}
                    mb={10}
                    size={7}
                    aria-label={`Password strength: ${strength} out of 4`}
                  />
                  {checks.map((requirement, index) => (
                    <Group key={index} gap={10} mt={7}>
                      {requirement.meets ? (
                        <IconCheck
                          style={{ width: rem(14), height: rem(14) }}
                          color="var(--mantine-color-teal-filled)"
                          aria-hidden="true"
                        />
                      ) : (
                        <IconX
                          style={{ width: rem(14), height: rem(14) }}
                          color="var(--mantine-color-red-filled)"
                          aria-hidden="true"
                        />
                      )}
                      <Text size="sm" c={requirement.meets ? "teal" : "red"}>
                        {requirement.label}
                        <span className="sr-only">
                          {requirement.meets
                            ? " - Requirement met"
                            : " - Requirement not met"}
                        </span>
                      </Text>
                    </Group>
                  ))}
                </Box>
              </Popover.Dropdown>
            </Popover>

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your new password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              error={getConfirmErrorMessage()}
              aria-invalid={submitted && password !== confirmPassword}
            />

            <Button
              type="submit"
              fullWidth
              loading={loading}
              style={{ backgroundColor: "#1A237E" }}
            >
              Update Password
            </Button>
          </Stack>
        </Paper>
      </Container>

      <style jsx>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
      `}</style>
    </Center>
  );
}
