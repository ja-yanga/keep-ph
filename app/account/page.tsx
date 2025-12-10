"use client";

import React, { useState, useEffect } from "react";
import {
  ActionIcon,
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
  Alert,
  Tabs,
  Progress,
  Popover,
  Divider,
  rem,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { createClient } from "@supabase/supabase-js";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import { useSession } from "@/components/SessionProvider";
import {
  IconAlertCircle,
  IconCheck,
  IconUser,
  IconLock,
  IconTrash,
  IconCamera,
  IconX,
  IconMapPin,
} from "@tabler/icons-react";
import AccountAddresses from "@/components/AccountAddresses";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Password Strength Helper
function PasswordRequirement({
  meets,
  label,
}: {
  meets: boolean;
  label: string;
}) {
  return (
    <Text
      c={meets ? "teal" : "red"}
      style={{ display: "flex", alignItems: "center" }}
      mt={7}
      size="sm"
    >
      {meets ? (
        <IconCheck style={{ width: rem(14), height: rem(14) }} />
      ) : (
        <IconX style={{ width: rem(14), height: rem(14) }} />
      )}
      <Box ml={10}>{label}</Box>
    </Text>
  );
}

export default function AccountPage() {
  const { session, refresh } = useSession();

  // Modal states
  const [opened, { open, close }] = useDisclosure(false);
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Profile Feedback
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [popoverOpened, setPopoverOpened] = useState(false);

  // Password Strength Logic
  const checks = [
    { label: "Includes at least 6 characters", meets: newPassword.length > 5 },
    { label: "Includes number", meets: /[0-9]/.test(newPassword) },
    { label: "Includes lowercase letter", meets: /[a-z]/.test(newPassword) },
    { label: "Includes uppercase letter", meets: /[A-Z]/.test(newPassword) },
  ];
  const strength = checks.reduce(
    (acc, requirement) => (!requirement.meets ? acc : acc + 1),
    0
  );
  const color = strength === 4 ? "teal" : strength > 2 ? "yellow" : "red";

  // Fetch data
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    open();
  };

  const handleConfirmSave = async () => {
    if (!session?.user) return;
    setSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      let avatarDataUrl: string | null = null;
      if (avatar) {
        avatarDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(avatar);
        });
      }

      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          avatar_data_url: avatarDataUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      await refresh();
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
    if (strength < 4) {
      setPasswordError("Password is too weak.");
      return;
    }

    openPasswordModal();
  };

  const confirmUpdatePassword = async () => {
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      closePasswordModal();
      setPasswordSuccess("Password updated successfully!");
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

      {/* Modals */}
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
            color="blue"
            // style={{ backgroundColor: "#26316D", color: "white" }}
          >
            Confirm Save
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={passwordOpened}
        onClose={closePasswordModal}
        title="Change Password?"
        centered
      >
        <Text size="sm" mb="lg">
          Are you sure you want to update your password?
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
            color="blue"
          >
            Confirm Update
          </Button>
        </Group>
      </Modal>

      <Box component="main" style={{ flex: 1 }} py="xl">
        <Container size="md">
          <Title order={2} mb="lg" c="dark.8">
            Account Settings
          </Title>

          <Paper withBorder radius="md" shadow="sm" p="md">
            <Tabs defaultValue="profile" orientation="horizontal">
              <Tabs.List mb="lg">
                <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
                  Profile
                </Tabs.Tab>

                <Tabs.Tab
                  value="addresses"
                  leftSection={<IconMapPin size={16} />}
                >
                  Addresses
                </Tabs.Tab>

                <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>
                  Security
                </Tabs.Tab>
              </Tabs.List>

              {/* --- PROFILE TAB --- */}
              <Tabs.Panel value="profile">
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
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <Stack align="center">
                        <Box pos="relative" style={{ cursor: "pointer" }}>
                          <FileButton
                            onChange={handleAvatarChange}
                            accept="image/png,image/jpeg"
                          >
                            {(props) => (
                              <Avatar
                                {...props}
                                src={avatarUrl}
                                size={150}
                                radius={150}
                                style={{
                                  border: "4px solid white",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                }}
                              />
                            )}
                          </FileButton>
                          <FileButton
                            onChange={handleAvatarChange}
                            accept="image/png,image/jpeg"
                          >
                            {(props) => (
                              <ActionIcon
                                {...props}
                                variant="filled"
                                color="blue"
                                radius="xl"
                                size="lg"
                                pos="absolute"
                                bottom={5}
                                right={10}
                              >
                                <IconCamera size={18} />
                              </ActionIcon>
                            )}
                          </FileButton>
                        </Box>
                        <Text size="xs" c="dimmed">
                          Click to upload new picture
                        </Text>
                      </Stack>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 8 }}>
                      <Stack gap="md">
                        <Group grow>
                          <TextInput
                            label="First Name"
                            value={firstName}
                            onChange={(e) =>
                              setFirstName(e.currentTarget.value)
                            }
                            required
                          />
                          <TextInput
                            label="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e.currentTarget.value)}
                            required
                          />
                        </Group>
                        <TextInput
                          label="Email"
                          value={email}
                          readOnly
                          description="Contact support to change email"
                          disabled
                        />

                        <Group justify="flex-end" mt="md">
                          <Button type="submit" color="blue">
                            Save Profile
                          </Button>
                        </Group>
                      </Stack>
                    </Grid.Col>
                  </Grid>
                </form>
              </Tabs.Panel>

              {/* --- ADDRESSES TAB --- */}
              <Tabs.Panel value="addresses">
                <Container size="md" px={0}>
                  {session?.user?.id ? (
                    <AccountAddresses userId={session.user.id} />
                  ) : (
                    <Paper withBorder p="md">
                      <Text c="dimmed">Sign in to manage your addresses.</Text>
                    </Paper>
                  )}
                </Container>
              </Tabs.Panel>

              {/* --- SECURITY TAB --- */}
              <Tabs.Panel value="security">
                <Container size="xs" px={0}>
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
                      onChange={(e) =>
                        setCurrentPassword(e.currentTarget.value)
                      }
                      required
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
                            label="New Password"
                            value={newPassword}
                            onChange={(e) =>
                              setNewPassword(e.currentTarget.value)
                            }
                            required
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
                        <PasswordRequirement
                          label="Includes at least 6 characters"
                          meets={newPassword.length > 5}
                        />
                        {checks.slice(1).map((requirement, index) => (
                          <PasswordRequirement
                            key={index}
                            label={requirement.label}
                            meets={requirement.meets}
                          />
                        ))}
                      </Popover.Dropdown>
                    </Popover>

                    <PasswordInput
                      label="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.currentTarget.value)
                      }
                      required
                    />

                    <Group justify="flex-end" mt="md">
                      <Button
                        onClick={handlePasswordSubmit}
                        loading={passwordLoading}
                        color="blue"
                      >
                        Update Password
                      </Button>
                    </Group>
                  </Stack>
                </Container>
              </Tabs.Panel>
            </Tabs>
          </Paper>
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
