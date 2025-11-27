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
  LoadingOverlay,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { createClient } from "@supabase/supabase-js";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import { useSession } from "@/components/SessionProvider";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AccountPage() {
  const { session, refresh } = useSession();

  // Modal state
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDJsdZ9uDbcolOcnMDxQTiA6vxMfSUGQqFHxbijFNSP6Vmp22EOqMCZ3r7hdfpBuFXb_digYU675pokgl_HLjoxj1hdPsgaXcmRvAY4xup2Hx9MEI6PTOOI_5yizPen6aLsW8ExgaIAfHiIqmxpIpzyv252JGnOzJ7mXVViCb5Jlv9K_tRiCbQRmKlGOfHpXYSnerWkBwcFTRUnsHdQ9nx94TO949a6EOb8MNFyQNguRi90Ihl-kXuT0Mrj4aOc8Jsblx6k7lAm4c4"
  );

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
    open(); // Open confirmation modal
  };

  const handleConfirmSave = async () => {
    if (!session?.user) return;
    setSaving(true);

    try {
      let publicUrl = session.profile?.avatar_url;

      // 1. Upload new avatar if selected
      if (avatar) {
        const ext = avatar.name.split(".").pop();
        const fileName = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatar, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);
          publicUrl = data.publicUrl;
        }
      }

      // 2. Update Profile
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (error) throw error;

      await refresh(); // Refresh session to update UI
      close();
      alert("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
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

      {/* Confirmation Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title={<Title order={4}>Save Changes?</Title>}
        centered
      >
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
            <LoadingOverlay
              visible={saving}
              overlayProps={{ radius: "sm", blur: 2 }}
            />

            <Title order={2} mb="lg" style={{ color: "#1A202C" }}>
              Profile Information
            </Title>

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

            <Stack gap="md">
              <PasswordInput label="Current Password" />
              <PasswordInput label="New Password" />
              <PasswordInput label="Confirm New Password" />
            </Stack>

            <Group justify="flex-end" mt="xl">
              <Button
                size="md"
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
