"use client";

import { Box, Container, Title, Button, Center, Text } from "@mantine/core";
import DashboardNav from "../../components/DashboardNav";
import Footer from "@/components/Footer";
import { useSession } from "@/components/SessionProvider";

export default function DashboardPage() {
  const { session, loading, error } = useSession();
  console.log("dashboard session:", { session, loading, error });
  const firstName = session?.profile?.first_name ?? null;
  const displayName = firstName ?? session?.user?.email ?? "User";

  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#FFFFFF",
        fontFamily: "Inter, sans-serif",
        color: "#1A202C",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* replaced inline header with component */}
      <DashboardNav />

      {/* Page content */}
      <Center style={{ flex: 1, paddingTop: 64, paddingBottom: 64 }}>
        <Container
          size="lg"
          style={{ textAlign: "center", paddingLeft: 16, paddingRight: 16 }}
        >
          <Title
            order={2}
            style={{ fontSize: 36, color: "#1A202C", fontWeight: 700 }}
          >
            Welcome, {loading ? "Loading…" : displayName}!
          </Title>

          <Text
            style={{
              marginTop: 16,
              color: "#718096",
              fontSize: 18,
              maxWidth: 880,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Ready to manage your mail effortlessly? Register for our mailroom
            service to get a dedicated address, receive notifications, and
            manage your packages and letters online.
          </Text>

          <Box style={{ marginTop: 28 }}>
            <Button
              component="a"
              href="/register"
              style={{
                backgroundColor: "#26316D",
                color: "#FFFFFF",
                fontWeight: 700,
                paddingLeft: 32,
                paddingRight: 32,
                paddingTop: 12,
                paddingBottom: 12,
                borderRadius: 12,
              }}
            >
              Register Mailroom Service
            </Button>
          </Box>
        </Container>
      </Center>

      <Footer />
    </Box>
  );
}
