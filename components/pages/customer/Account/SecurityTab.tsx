import {
  Alert,
  Box,
  Container,
  rem,
  Stack,
  Text,
  PasswordInput,
  Popover,
  Progress,
  Group,
  Button,
  Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertCircle, IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";

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
      <Box component="span" ml={10}>
        {label}
      </Box>
    </Text>
  );
}

const SecurityTab = () => {
  const [
    passwordOpened,
    { open: openPasswordModal, close: closePasswordModal },
  ] = useDisclosure(false);

  const [popoverOpened, setPopoverOpened] = useState(false);
  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  // Password Strength Logic
  const checks = [
    { label: "Includes at least 6 characters", meets: newPassword.length > 5 },
    { label: "Includes number", meets: /[0-9]/.test(newPassword) },
    { label: "Includes lowercase letter", meets: /[a-z]/.test(newPassword) },
    { label: "Includes uppercase letter", meets: /[A-Z]/.test(newPassword) },
  ];
  const strength = checks.reduce(
    (acc, requirement) => (!requirement.meets ? acc : acc + 1),
    0,
  );
  let color: string;
  if (strength === 4) {
    color = "teal";
  } else if (strength > 2) {
    color = "yellow";
  } else {
    color = "red";
  }

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
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to change password.";
      setPasswordError(errorMessage);
      closePasswordModal();
    } finally {
      setPasswordLoading(false);
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

  return (
    <>
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
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
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
                  onChange={(e) => setNewPassword(e.currentTarget.value)}
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
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
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
    </>
  );
};

export default SecurityTab;
