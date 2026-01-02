"use client";

import { Box, Center, Text, useMantineTheme } from "@mantine/core";

export default function Footer() {
  const theme = useMantineTheme();
  return (
    <Box
      component="footer"
      py="md"
      role="contentinfo"
      style={{ borderTop: `1px solid ${theme.colors.gray[3]}` }}
    >
      <Center>
        <Text size="sm" c="dimmed">
          © {new Date().getFullYear()} Keep PH. All rights reserved.
        </Text>
      </Center>
    </Box>
  );
}
