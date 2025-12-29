"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Loader,
  Center,
  Container,
  Paper,
  Title,
  Text,
  Stack,
  Box,
  Button,
  ThemeIcon,
  Transition,
} from "@mantine/core";
import { IconCheck, IconCircleCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

export default function MailroomRegisterSuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [debug, setDebug] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const order = params.get("order");
    if (!order) {
      router.push("/");
      return;
    }
    const orderStr = order;
    let mounted = true;

    async function check() {
      try {
        // check server-side registration finalization (preferred)
        const res = await fetch(API_ENDPOINTS.mailroom.lookupByOrder(orderStr));
        const json = await res.json().catch(() => null);
        setDebug(json);
        const registration = json?.data ?? null;

        if (!mounted) return;

        if (
          registration &&
          (registration.mailroom_registration_status === true ||
            registration.paid)
        ) {
          setStatus("paid");
          setTimeout(() => {
            router.push("/dashboard");
          }, 3000);
          return;
        }

        // fallback: if registration not found, still check payment and retry
        setStatus("pending");
        setTimeout(check, 1500);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setStatus("pending");
        setTimeout(check, 1500);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    check();
    return () => {
      mounted = false;
    };
  }, [router]);

  let content = null;

  if (loading) {
    content = (
      <Stack align="center" gap="md">
        <Loader size="xl" type="bars" color="blue" />
        <Text size="lg" fw={500} c="dimmed">
          Verifying your registration...
        </Text>
      </Stack>
    );
  } else if (status === "paid") {
    content = (
      <Transition
        mounted={status === "paid"}
        transition="fade"
        duration={400}
        timingFunction="ease"
      >
        {(styles) => (
          <Paper
            withBorder
            shadow="xl"
            p={40}
            radius="lg"
            style={{
              ...styles,
              width: "100%",
              textAlign: "center",
              background: "var(--mantine-color-body)",
            }}
          >
            <Stack align="center" gap="xl">
              <Box
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  background: "rgba(18, 184, 134, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ThemeIcon color="teal" size={70} radius="xl" variant="light">
                  <IconCircleCheck size={50} />
                </ThemeIcon>
              </Box>

              <Stack gap="xs">
                <Title order={1} fw={800} style={{ fontSize: 32 }}>
                  Registration Successful!
                </Title>
                <Text size="lg" c="dimmed">
                  Your mailroom account has been set up successfully.
                </Text>
              </Stack>

              <Alert
                icon={<IconCheck />}
                color="teal"
                radius="md"
                variant="light"
                style={{ width: "100%" }}
              >
                You will be redirected to your dashboard in 3 seconds...
              </Alert>

              <Button
                variant="filled"
                color="#26316D"
                size="md"
                radius="md"
                fullWidth
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard Now
              </Button>
            </Stack>
          </Paper>
        )}
      </Transition>
    );
  } else {
    content = (
      <Paper
        withBorder
        shadow="md"
        p={40}
        radius="lg"
        style={{ width: "100%", textAlign: "center" }}
      >
        <Stack align="center" gap="xl">
          <Box
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(250, 176, 5, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Loader size="lg" color="yellow" variant="dots" />
          </Box>

          <Stack gap="xs">
            <Title order={2} fw={700}>
              Awaiting Registration
            </Title>
            <Text size="md" c="dimmed">
              We're waiting for payment confirmation. This page will update
              automatically.
            </Text>
          </Stack>

          <Box style={{ width: "100%", textAlign: "left" }}>
            <Text size="xs" fw={700} c="dimmed" mb={5} tt="uppercase">
              Transaction Details
            </Text>
            <Paper
              bg="var(--mantine-color-gray-0)"
              p="xs"
              radius="sm"
              style={{
                maxHeight: 150,
                overflow: "auto",
                border: "1px solid var(--mantine-color-gray-2)",
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontSize: 10,
                  fontFamily: "var(--mantine-font-family-monospace)",
                }}
              >
                {JSON.stringify(debug, null, 2)}
              </pre>
            </Paper>
          </Box>
        </Stack>
      </Paper>
    );
  }

  return (
    <Container size="sm">
      <Center style={{ minHeight: "80vh" }}>{content}</Center>
    </Container>
  );
}
