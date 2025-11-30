"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Title,
  Paper,
  Grid,
  TextInput,
  Button,
  Avatar,
  Stack,
  Group,
  PasswordInput,
  Text,
  FileButton,
  Modal,
  Alert, // Add Alert
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { createClient } from "@supabase/supabase-js";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import { useSession } from "@/components/SessionProvider";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react"; // Add Icons

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AccountPage() {
  const { session, refresh } = useSession();

  // Modal state for Profile
  const [opened, { open, close }] = useDisclosure(false);
  // Modal state for Password
  const [
    passwordOpened,
    { open: openPasswordModal, close: closePasswordModal },
  ] = useDisclosure(false);

  const [saving, setSaving] = useState(false);

  // Profile Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDJsdZ9uDbcolOcnMDxQTiA6vxMfSUGQqFHxbijFNSP6Vmp22EOqMCZ3r7hdfpBuFXb_digYU675pokgl_HLjoxj1hdPsgaXcmRvAY4xup2Hx9MEI6PTOOI_5yizPen6aLsW8ExgaIAfHiIqmxpIpzyv252JGnOzJ7mXVViCb5Jlv9K_tRiCbQRmKlGOfHpXYSnerWkBwcFTRUnsHdQ9nx94TO949a6EOb8MNFyQNguRi90Ihl-kXuT0Mrj4aOc8Jsblx6k7lAm4c4"
  );

  // Profile Feedback
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Password Feedback
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Fetch data from session
  useEffect(() => {
    if (session) {
      if (session.user?.email) setEmail(session.user.email);
      if (session.profile?.first_name) setFirstName(session.profile.first_name);
      if (session.profile?.last_name) setLastName(session.profile.last_name);
      if (session.profile?.avatar_url) setAvatarUrl(session.profile.avatar_url);
    }
  }, [session]);

  const handleAvatarChange = (file: File | null) => {
    setAvatar(file);
    if (file) {
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  // Triggered by form submit (validates required fields first)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    open(); // Open confirmation modal
  };

  const handleConfirmSave = async () => {
    if (!session?.user) return;
    setSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      let avatarDataUrl: string | null = null;

      // 1. Convert avatar to Base64 if a new file is selected
      if (avatar) {
        avatarDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(avatar);
        });
      }

      // 2. Call API to Update Profile (sending the file data)
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          avatar_data_url: avatarDataUrl, // Send the data URL
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      await refresh(); // Refresh session to update UI
      close();
      setProfileSuccess("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      setProfileError(err.message || "Failed to update profile.");
      close();
    } finally {
      setSaving(false);
    }
  };

  // 1. Validate password inputs and open modal
  const handlePasswordSubmit = () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    openPasswordModal();
  };

  // 2. Execute API call
  const confirmUpdatePassword = async () => {
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      closePasswordModal();
      setPasswordSuccess("Password updated successfully!");
      // Clear fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.message || "Failed to update password");
      closePasswordModal();
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#F8FAFC",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DashboardNav />

      {/* Profile Confirmation Modal */}
      <Modal opened={opened} onClose={close} title="Save Changes?" centered>
        <Text size="sm" mb="lg">
          Are you sure you want to update your profile information?
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSave}
            loading={saving}
            style={{ backgroundColor: "#26316D", color: "white" }}
          >
            Confirm Save
          </Button>
        </Group>
      </Modal>

      {/* Password Confirmation Modal */}
      <Modal
        opened={passwordOpened}
        onClose={closePasswordModal}
        title="Change Password?"
        centered
      >
        <Text size="sm" mb="lg">
          Are you sure you want to update your password? You will need to use
          the new password next time you sign in.
        </Text>
        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={closePasswordModal}
            disabled={passwordLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmUpdatePassword}
            loading={passwordLoading}
            style={{ backgroundColor: "#26316D", color: "white" }}
          >
            Confirm Update
          </Button>
        </Group>
      </Modal>

      <Box component="main" style={{ flex: 1 }} py="xl">
        <Container size="md">
          {/* Profile Information Section */}
          <Paper
            withBorder
            p="xl"
            radius="md"
            shadow="sm"
            mb="xl"
            pos="relative"
          >
            <Title order={2} mb="lg" style={{ color: "#1A202C" }}>
              Profile Information
            </Title>

            {profileError && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Error"
                color="red"
                mb="md"
                withCloseButton
                onClose={() => setProfileError(null)}
              >
                {profileError}
              </Alert>
            )}
            {profileSuccess && (
              <Alert
                icon={<IconCheck size={16} />}
                title="Success"
                color="teal"
                mb="md"
                withCloseButton
                onClose={() => setProfileSuccess(null)}
              >
                {profileSuccess}
              </Alert>
            )}

            <form onSubmit={handleFormSubmit}>
              <Grid gutter="xl">
                {/* Avatar Column */}
                <Grid.Col span={{ base: 12, md: 3 }}>
                  <Stack align="center">
                    <Avatar
                      src={avatarUrl}
                      size={120}
                      radius={120}
                      style={{ border: "1px solid #E2E8F0" }}
                    />
                    <FileButton
                      onChange={handleAvatarChange}
                      accept="image/png,image/jpeg"
                    >
                      {(props) => (
                        <Button
                          {...props}
                          variant="subtle"
                          size="sm"
                          c="#26316D"
                          style={{ fontWeight: 500 }}
                        >
                          Change Picture
                        </Button>
                      )}
                    </FileButton>
                  </Stack>
                </Grid.Col>

                {/* Form Fields Column */}
                <Grid.Col span={{ base: 12, md: 9 }}>
                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.currentTarget.value)}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.currentTarget.value)}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <TextInput
                        label="Email"
                        value={email}
                        readOnly
                        styles={{
                          input: {
                            backgroundColor: "#F7FAFC",
                            color: "#718096",
                            cursor: "not-allowed",
                          },
                        }}
                      />
                    </Grid.Col>
                  </Grid>
                </Grid.Col>
              </Grid>

              <Group justify="flex-end" mt="xl">
                <Button
                  type="submit"
                  size="md"
                  style={{ backgroundColor: "#26316D", color: "white" }}
                >
                  Save Changes
                </Button>
              </Group>
            </form>
          </Paper>

          {/* Change Password Section */}
          <Paper withBorder p="xl" radius="md" shadow="sm">
            <Title order={2} mb="lg" style={{ color: "#1A202C" }}>
              Change Password
            </Title>

            {passwordError && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Error"
                color="red"
                mb="md"
                withCloseButton
                onClose={() => setPasswordError(null)}
              >
                {passwordError}
              </Alert>
            )}
            {passwordSuccess && (
              <Alert
                icon={<IconCheck size={16} />}
                title="Success"
                color="teal"
                mb="md"
                withCloseButton
                onClose={() => setPasswordSuccess(null)}
              >
                {passwordSuccess}
              </Alert>
            )}

            <Stack gap="md">
              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.currentTarget.value)}
              />
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.currentTarget.value)}
              />
              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              />
            </Stack>

            <Group justify="flex-end" mt="xl">
              <Button
                size="md"
                onClick={handlePasswordSubmit}
                loading={passwordLoading}
                style={{ backgroundColor: "#26316D", color: "white" }}
              >
                Update Password
              </Button>
            </Group>
          </Paper>
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
