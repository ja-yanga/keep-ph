"use client";

import React, { useState, useEffect } from "react";
import { Box, Container, Title, Paper, Tabs } from "@mantine/core";
import { useSession } from "@/components/SessionProvider";
import { IconUser, IconLock, IconMapPin } from "@tabler/icons-react";
import { compressToAVIF } from "@/utils/compress-to-avif";
import ProfileTab from "./ProfileTab";
import AccountAddressesTab from "./AddressesTab";
import SecurityTab from "./SecurityTab";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

export default function AccountSettings() {
  const { session, refresh } = useSession();

  // Profile Form State
  const [profileForm, setProfileForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    avatarUrl: null,
  });

  // Profile Feedback
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    if (session) {
      // load names from KYC instead of editable profile
      (async () => {
        try {
          const userId = session.user?.id;
          if (!userId) return;
          const res = await fetch(
            `/api/user/kyc?userId=${encodeURIComponent(userId)}`,
          );
          if (!res.ok) return;
          const json = await res.json();

          // normalize possible response shapes and pick the KYC object
          const payload = json?.data ?? json;

          type T_KycObjProps = {
            user?: Record<string, unknown>;
            [key: string]: unknown;
          } | null;
          let kycObj: T_KycObjProps = null;

          if (!payload) {
            kycObj = null;
          } else if (Array.isArray(payload) && payload.length > 0) {
            kycObj = payload[0];
          } else if (payload.kyc && typeof payload.kyc === "object") {
            kycObj = payload.kyc as T_KycObjProps;
          } else if (payload.data && typeof payload.data === "object") {
            // handle { data: { kyc: { ... } } } or { data: { ... } }
            const pdata = payload.data as Record<string, unknown>;
            if (pdata.kyc && typeof pdata.kyc === "object") {
              kycObj = pdata.kyc as T_KycObjProps;
            } else {
              kycObj = pdata;
            }
          } else if (typeof payload === "object") {
            kycObj = payload as T_KycObjProps;
          } else {
            kycObj = null;
          }

          if (kycObj) {
            const first =
              kycObj.user_kyc_first_name ??
              kycObj.user_kyc_firstName ??
              kycObj.first_name ??
              kycObj.firstName ??
              "";
            const last =
              kycObj.user_kyc_last_name ??
              kycObj.user_kyc_lastName ??
              kycObj.last_name ??
              kycObj.lastName ??
              "";
            const email = kycObj.user?.users_email ?? "";
            const avatar_url = kycObj.user?.users_avatar_url ?? "";
            setProfileForm((prevState) => {
              return {
                ...prevState,
                email: email as string,
                avatarUrl: avatar_url as string,
                firstName: String(first),
                lastName: String(last),
              };
            });
          }
        } catch {
          /* ignore */
        }
      })();
    }
  }, [session]);

  const handleAvatarChange = async (file: File | null) => {
    // setAvatar(file);
    if (file) {
      try {
        // Show original file size
        const originalSize = (file.size / 1024).toFixed(2);
        console.log(`Original image size: ${originalSize} KB`);

        // Compress to AVIF (works with any size input)
        const compressedBlob = await compressToAVIF(file);

        const compressedSize = (compressedBlob.size / 1024).toFixed(2);
        console.log(`Compressed to: ${compressedSize} KB`);

        // Double-check the size constraint
        if (compressedBlob.size > 100 * 1024) {
          throw new Error(
            `Compressed image is ${compressedSize} KB, which exceeds the 100 KB limit.`,
          );
        }
        const previewUrl = URL.createObjectURL(compressedBlob);
        setProfileForm((prevState) => {
          return {
            ...prevState,
            avatarUrl: previewUrl,
          };
        });
        handleUploadAvatar(compressedBlob as File | null);
      } catch (error) {
        setProfileError(
          error instanceof Error ? error.message : "Failed to upload avatar",
        );
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    open();
  };

  const handleUploadAvatar = async (file?: File | null) => {
    if (!session?.user) return;
    // setSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      let avatarDataUrl: string | null = null;
      if (file) {
        avatarDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const res = await fetch(API_ENDPOINTS.uploads.avatar, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update profile.";
      setProfileError(errorMessage);
      close();
    } finally {
      // setSaving(false);
    }
  };

  return (
    <>
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
                <ProfileTab
                  profileError={profileError}
                  profileForm={profileForm}
                  profileSuccess={profileSuccess}
                  onCloseProfileSuccess={() => setProfileSuccess(null)}
                  onCloseProfileError={() => setProfileError(null)}
                  onHandleFormSubmit={handleFormSubmit}
                  onHandleAvatarChange={handleAvatarChange}
                />
              </Tabs.Panel>

              {/* --- ADDRESSES TAB --- */}
              <Tabs.Panel value="addresses">
                <AccountAddressesTab userId={session?.user?.id as string} />
              </Tabs.Panel>

              {/* --- SECURITY TAB --- */}
              <Tabs.Panel value="security">
                <SecurityTab />
              </Tabs.Panel>
            </Tabs>
          </Paper>
        </Container>
      </Box>
    </>
  );
}
