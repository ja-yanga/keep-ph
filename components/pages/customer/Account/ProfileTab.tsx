import { useAppDispatch, useAppSelector } from "@/store";
import {
  ActionIcon,
  Alert,
  Avatar,
  Box,
  Center,
  FileButton,
  Grid,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertCircle, IconCamera, IconCheck } from "@tabler/icons-react";
import { useSession } from "@/components/SessionProvider";
import { useEffect } from "react";
import { useCallback } from "react";
import { useMemo } from "react";
import { normalizeKycData } from "@/utils/normalize-data/kyc-details";
import { transformKycDetails } from "@/utils/transform/kyc-details";
import {
  setKycDetails,
  setKycDetailsError,
  setKycDetailsLoading,
  setKycDetailsSuccess,
} from "@/store/slices/userSlice";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { compressToAVIF } from "@/utils/compress-to-avif";

const ProfileTab = () => {
  const { kyc, error, success, loading } = useAppSelector(
    (state) => state.user.kycDetails,
  );

  const { session, refresh } = useSession();
  const dispatch = useAppDispatch();

  const userId = useMemo(() => session?.user?.id, [session?.user?.id]);

  const fetchKycData = async () => {
    const abortController = new AbortController();
    const signal = abortController.signal;
    dispatch(setKycDetailsLoading(true));
    try {
      const res = await fetch(
        `/api/user/kyc?userId=${encodeURIComponent(userId as string)}`,
        { signal },
      );
      if (!res.ok || signal.aborted) return;

      const json = await res.json();
      const payload = json?.data ?? json;
      const kycObj = normalizeKycData(payload);

      if (kycObj && !signal.aborted) {
        const transformedKycDetails = transformKycDetails(kycObj);
        dispatch(setKycDetails(transformedKycDetails));
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        // Silently ignore fetch errors
      }
    } finally {
      dispatch(setKycDetailsLoading(false));
    }

    return () => {
      abortController.abort();
    };
  };

  // Fetch data with proper cleanup
  useEffect(() => {
    if (!userId) return;

    fetchKycData();
  }, [userId]);

  // Memoized handlers
  const handleCloseProfileSuccess = useCallback(() => {
    dispatch(setKycDetailsSuccess(null));
  }, []);

  const handleCloseProfileError = useCallback(() => {
    dispatch(setKycDetailsError(null));
  }, []);

  const handleUploadAvatar = useCallback(
    async (file?: File | Blob | null) => {
      if (!session?.user) return;

      dispatch(setKycDetailsError(null));
      dispatch(setKycDetailsSuccess(null));

      try {
        let avatarDataUrl: string | null = null;
        if (file) {
          avatarDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve(typeof reader.result === "string" ? reader.result : "");
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
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to update profile");
        }
        await fetchKycData();
        await refresh();
        dispatch(setKycDetailsSuccess("Profile updated successfully!"));
      } catch (err: unknown) {
        console.error(err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update profile.";
        dispatch(setKycDetailsError(errorMessage));
      }
    },
    [session?.user, refresh],
  );

  const handleAvatarChange = useCallback(
    async (file: File | null) => {
      if (!file) return;

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
        // const avatarFile = new File([compressedBlob], file.name, { type: compressedBlob.type });

        await handleUploadAvatar(compressedBlob);
      } catch (error) {
        dispatch(
          setKycDetailsError(
            error instanceof Error ? error.message : "Failed to upload avatar",
          ),
        );
      }
    },
    [handleUploadAvatar],
  );

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setKycDetailsError(null));
    dispatch(setKycDetailsSuccess(null));
    // Note: Removed undefined open() call - form submission handled by handleUploadAvatar
  }, []);

  return (
    <>
      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          mb="md"
          withCloseButton
          onClose={handleCloseProfileError}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          icon={<IconCheck size={16} />}
          title="Success"
          color="teal"
          mb="md"
          withCloseButton
          onClose={handleCloseProfileSuccess}
        >
          {success}
        </Alert>
      )}

      <form onSubmit={handleFormSubmit}>
        {loading && (
          <Center style={{ paddingTop: 64, paddingBottom: 64 }}>
            <Loader />
          </Center>
        )}
        {kyc && (
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
                        src={kyc?.user?.avatarUrl as string}
                        size={150}
                        radius={150}
                        alt={
                          kyc?.firstName || kyc?.lastName
                            ? `${kyc?.firstName ?? ""} ${kyc?.lastName ?? ""}`.trim()
                            : "User avatar"
                        }
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
                        aria-label="Change avatar" // <-- This is key
                      >
                        <IconCamera size={18} />
                      </ActionIcon>
                    )}
                  </FileButton>
                </Box>
                <Text size="xs" c="#313131">
                  Click to upload new picture
                </Text>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 8 }}>
              <Stack gap="md">
                <Group grow>
                  <TextInput
                    label="First Name"
                    value={(kyc?.firstName || "") as string}
                    readOnly
                  />
                  <TextInput
                    label="Last Name"
                    value={(kyc?.lastName || "") as string}
                    readOnly
                  />
                </Group>
                <TextInput
                  label="Email"
                  value={(kyc?.user?.email || "") as string}
                  readOnly
                  styles={{
                    description: {
                      color: "#313131",
                    },
                  }}
                  description="Contact support to change email"
                />
              </Stack>
            </Grid.Col>
          </Grid>
        )}
      </form>
    </>
  );
};

export default ProfileTab;
