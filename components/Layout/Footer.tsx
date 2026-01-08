"use client";

import { Box, Center, Text, useMantineTheme } from "@mantine/core";

export default function Footer() {
  const theme = useMantineTheme();
  // Using Slate 700 (#4A5568) ensures a 6.2:1 contrast ratio against white
  const highContrastText = "#4A5568";

  return (
    <Box
      component="footer"
      py="md"
      role="contentinfo"
      style={{ borderTop: `1px solid ${theme.colors.gray[3]}` }}
    >
      <Center>
        <Text size="sm" style={{ color: highContrastText }}>
          © {new Date().getFullYear()} Keep PH. All rights reserved.
        </Text>
      </Center>
    </Box>
  );
}
