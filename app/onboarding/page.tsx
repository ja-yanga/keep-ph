"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Title,
  Text,
  Paper,
  Avatar,
  Button,
  TextInput,
  Grid,
  Stack,
} from "@mantine/core";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import { useSession } from "@/components/SessionProvider";

export default function OnboardingPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const avatarUrl = avatar ? URL.createObjectURL(avatar) : null;
  const inputRef = useRef<HTMLInputElement | null>(null);

  // use global session provider instead of manual fetch
  const { session: providerSession, loading } = useSession();

  useEffect(() => {
    if (!providerSession) return;
    if (providerSession.user?.email) setEmail(providerSession.user.email);
    if (providerSession.profile?.first_name)
      setFirstName(providerSession.profile.first_name);
    if (providerSession.profile?.last_name)
      setLastName(providerSession.profile.last_name);
  }, [providerSession]);

  // helper: convert File -> data URL
  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const avatarDataUrl = avatar ? await fileToDataUrl(avatar) : null;

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email,
      avatar: avatarDataUrl,
    };

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // handle error (show toast / message)
      return;
    }

    // refresh global session so needs_onboarding updates
    await refresh();

    // navigate to dashboard
    router.push("/dashboard");
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) setAvatar(file);
  };

  return (
    <>
      <DashboardNav />

      <Box component="main">
        <Container size="sm" p="xl" my="lg">
          <Stack gap="xl" align="center">
            <Box>
              <Title order={1} style={{ fontWeight: 700, color: "#1A237E" }}>
                Complete Your Profile
              </Title>
              <Text color="#6B7280" size="l">
                Just a few more details to get you started.
              </Text>
            </Box>

            <Paper radius="md" withBorder p="lg" style={{ width: "100%" }}>
              <form onSubmit={handleSubmit}>
                <Stack gap="lg">
                  {/* Row 1: Avatar (centered) + Upload button that opens native file picker */}
                  <Stack align="center" gap="sm">
                    <Box>
                      <Avatar
                        src={avatarUrl ?? undefined}
                        radius="xl"
                        size={70}
                        color="gray"
                        styles={{ placeholder: { backgroundColor: "#E8EAF6" } }}
                        mb="sm"
                      />
                      <Button
                        size="xs"
                        variant="filled"
                        color="blue"
                        radius="xl"
                        type="button"
                        onClick={handleUploadClick}
                      >
                        Upload
                      </Button>
                    </Box>

                    {/* hidden native file input */}
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                  </Stack>

                  {/* Row 2: Email Address */}
                  <TextInput label="Email Address" value={email} readOnly />

                  {/* Row 3: two columns - First Name | Last Name */}
                  <Grid>
                    <Grid.Col>
                      <TextInput
                        label="First Name"
                        placeholder="Juan"
                        value={firstName}
                        onChange={(e) => setFirstName(e.currentTarget.value)}
                      />
                    </Grid.Col>
                    <Grid.Col>
                      <TextInput
                        label="Last Name"
                        placeholder="Dela Cruz"
                        value={lastName}
                        onChange={(e) => setLastName(e.currentTarget.value)}
                      />
                    </Grid.Col>
                  </Grid>

                  <Button fullWidth size="lg" type="submit">
                    Save and Continue
                  </Button>
                </Stack>
              </form>
            </Paper>
          </Stack>
        </Container>
      </Box>

      <Footer />
    </>
  );
}
