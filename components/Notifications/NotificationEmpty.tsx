import { Box, Text } from "@mantine/core";

const NotificationEmpty = () => {
  return (
    <Box p="xl" ta="center">
      <Text size="sm" c="dimmed">
        No notifications yet
      </Text>
    </Box>
  );
};

export default NotificationEmpty;
