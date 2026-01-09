import {
  ActionIcon,
  Alert,
  Avatar,
  Box,
  FileButton,
  Grid,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertCircle, IconCamera, IconCheck } from "@tabler/icons-react";

type ProfileTabProps = {
  profileError?: string | null;
  profileForm: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  };
  profileSuccess?: string | null;
  onHandleFormSubmit: (e: React.FormEvent) => void;
  onCloseProfileSuccess: () => void;
  onCloseProfileError: () => void;
  onHandleAvatarChange: (file: File | null) => void;
};

const ProfileTab = ({
  profileError,
  profileForm,
  profileSuccess,
  onCloseProfileSuccess,
  onCloseProfileError,
  onHandleFormSubmit,
  onHandleAvatarChange,
}: ProfileTabProps) => {
  const { firstName, lastName, email, avatarUrl } = profileForm;
  return (
    <>
      {/* Modals */}
      {/* <Modal opened={opened} onClose={close} title="Save Changes?" centered>
        <Text size="sm" mb="lg">
          Are you sure you want to update your profile information?
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleUploadAvatar} loading={saving} color="blue">
            Confirm Save
          </Button>
        </Group>
      </Modal> */}
      {profileError && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          mb="md"
          withCloseButton
          onClose={onCloseProfileError}
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
          onClose={onCloseProfileSuccess}
        >
          {profileSuccess}
        </Alert>
      )}

      <form onSubmit={onHandleFormSubmit}>
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack align="center">
              <Box pos="relative" style={{ cursor: "pointer" }}>
                <FileButton
                  onChange={onHandleAvatarChange}
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
                  onChange={onHandleAvatarChange}
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
                <TextInput label="First Name" value={firstName} readOnly />
                <TextInput label="Last Name" value={lastName} readOnly />
              </Group>
              <TextInput
                label="Email"
                value={email}
                readOnly
                styles={{
                  description: {
                    color: "#313131",
                  },
                }}
                description="Contact support to change email"
              />

              {/* <Group justify="flex-end" mt="md">
                <Button type="submit" color="blue">
                  Save Profile
                </Button>
              </Group> */}
            </Stack>
          </Grid.Col>
        </Grid>
      </form>
    </>
  );
};

export default ProfileTab;
