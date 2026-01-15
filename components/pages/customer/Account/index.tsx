"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Box, Container, Title, Paper, Tabs } from "@mantine/core";
import { useSession } from "@/components/SessionProvider";
import { IconUser, IconLock, IconMapPin } from "@tabler/icons-react";
import { compressToAVIF } from "@/utils/compress-to-avif";
import ProfileTab from "./ProfileTab";
import AccountAddressesTab from "./AddressesTab";
import SecurityTab from "./SecurityTab";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

type T_KycObjProps = {
  user?: Record<string, unknown>;
  [key: string]: unknown;
} | null;

// Memoized KYC normalization function
const normalizeKycData = (payload: unknown): T_KycObjProps => {
  if (!payload) return null;

  if (Array.isArray(payload) && payload.length > 0) {
    return payload[0] as T_KycObjProps;
  }

  if (typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;

  if (obj.kyc && typeof obj.kyc === "object") {
    return obj.kyc as T_KycObjProps;
  }

  if (obj.data && typeof obj.data === "object") {
    const pdata = obj.data as Record<string, unknown>;
    if (pdata.kyc && typeof pdata.kyc === "object") {
      return pdata.kyc as T_KycObjProps;
    }
    return pdata as T_KycObjProps;
  }

  return obj as T_KycObjProps;
};

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

  // Track object URLs for cleanup
  const objectUrlRef = useRef<string | null>(null);

  // Memoize userId to prevent unnecessary re-fetches
  const userId = useMemo(() => session?.user?.id, [session?.user?.id]);

  // Fetch data with proper cleanup
  useEffect(() => {
    if (!userId) return;

    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchKycData = async () => {
      try {
        const res = await fetch(
          `/api/user/kyc?userId=${encodeURIComponent(userId)}`,
          { signal },
        );
        if (!res.ok || signal.aborted) return;

        const json = await res.json();
        const payload = json?.data ?? json;
        const kycObj = normalizeKycData(payload);

        if (kycObj && !signal.aborted) {
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
          const email = (kycObj.user?.users_email as string) ?? "";
          const avatar_url = (kycObj.user?.users_avatar_url as string) ?? "";

          setProfileForm((prevState) => ({
            ...prevState,
            email,
            avatarUrl: avatar_url,
            firstName: String(first),
            lastName: String(last),
          }));
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          // Silently ignore fetch errors
        }
      }
    };

    void fetchKycData();

    return () => {
      abortController.abort();
    };
  }, [userId]);

  // Cleanup object URLs on unmount or when avatarUrl changes
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Memoized handlers
  const handleCloseProfileSuccess = useCallback(() => {
    setProfileSuccess(null);
  }, []);

  const handleCloseProfileError = useCallback(() => {
    setProfileError(null);
  }, []);

  const handleUploadAvatar = useCallback(
    async (file?: File | null) => {
      if (!session?.user) return;

      setProfileError(null);
      setProfileSuccess(null);

      try {
        let avatarDataUrl: string | null = null;
        if (file) {
          avatarDataUrl = await new Promise<string>((resolve, reject) => {
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
        setProfileSuccess("Profile updated successfully!");
      } catch (err: unknown) {
        console.error(err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update profile.";
        setProfileError(errorMessage);
      }
    },
    [session?.user, refresh],
  );

  const handleAvatarChange = useCallback(
    async (file: File | null) => {
      if (!file) return;

      // Cleanup previous object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      try {
        // Compress to AVIF (works with any size input)
        const compressedBlob = await compressToAVIF(file);

        const compressedSize = (compressedBlob.size / 1024).toFixed(2);

        // Double-check the size constraint
        if (compressedBlob.size > 100 * 1024) {
          throw new Error(
            `Compressed image is ${compressedSize} KB, which exceeds the 100 KB limit.`,
          );
        }

        const previewUrl = URL.createObjectURL(compressedBlob);
        objectUrlRef.current = previewUrl;

        setProfileForm((prevState) => ({
          ...prevState,
          avatarUrl: previewUrl,
        }));

        await handleUploadAvatar(compressedBlob as File);
      } catch (error) {
        setProfileError(
          error instanceof Error ? error.message : "Failed to upload avatar",
        );
      }
    },
    [handleUploadAvatar],
  );

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    // Note: Removed undefined open() call - form submission handled by handleUploadAvatar
  }, []);

  // Memoize userId string to prevent unnecessary re-renders of AddressesTab
  const userIdString = useMemo(
    () => (session?.user?.id as string) || "",
    [session?.user?.id],
  );

  return (
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
                onCloseProfileSuccess={handleCloseProfileSuccess}
                onCloseProfileError={handleCloseProfileError}
                onHandleFormSubmit={handleFormSubmit}
                onHandleAvatarChange={handleAvatarChange}
              />
            </Tabs.Panel>

            {/* --- ADDRESSES TAB --- */}
            <Tabs.Panel value="addresses">
              {userIdString && <AccountAddressesTab userId={userIdString} />}
            </Tabs.Panel>

            {/* --- SECURITY TAB --- */}
            <Tabs.Panel value="security">
              <SecurityTab />
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Container>
    </Box>
  );
}
