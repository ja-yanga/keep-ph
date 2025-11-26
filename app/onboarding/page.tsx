"use client";

import React, { useRef, useState } from "react";
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

export default function OnboardingPage() {
  const [avatar, setAvatar] = useState<File | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email] = useState("user@email.com");
  const avatarUrl = avatar ? URL.createObjectURL(avatar) : null;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // implement save logic
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

      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 64,
          paddingBottom: 64,
          width: "100%",
        }}
      >
        <Container size="sm" p="xl" my="lg">
          <Stack spacing="xl" align="center">
            <Box sx={{ textAlign: "center" }}>
              <Title
                order={1}
                align="center"
                style={{ fontWeight: 700, color: "#1A237E" }}
              >
                Complete Your Profile
              </Title>
              <Text color="#6B7280" size="l" align="center">
                Just a few more details to get you started.
              </Text>
            </Box>

            <Paper radius="md" withBorder p="lg" style={{ width: "100%" }}>
              <form onSubmit={handleSubmit}>
                <Stack spacing="lg">
                  {/* Row 1: Avatar (centered) + Upload button that opens native file picker */}
                  <Stack align="center" spacing="sm">
                    <Box sx={{ position: "relative" }}>
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
                        sx={{
                          position: "absolute",
                          right: -6,
                          bottom: -6,
                          minWidth: 34,
                          height: 34,
                          padding: 0,
                        }}
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
                    <Grid.Col xs={12} sm={6}>
                      <TextInput
                        label="First Name"
                        placeholder="Juan"
                        value={firstName}
                        onChange={(e) => setFirstName(e.currentTarget.value)}
                      />
                    </Grid.Col>
                    <Grid.Col xs={12} sm={6}>
                      <TextInput
                        label="Last Name"
                        placeholder="Dela Cruz"
                        value={lastName}
                        onChange={(e) => setLastName(e.currentTarget.value)}
                      />
                    </Grid.Col>
                  </Grid>

                  <Button
                    fullWidth
                    size="lg"
                    type="submit"
                    sx={{ backgroundColor: "#1A237E" }}
                  >
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
