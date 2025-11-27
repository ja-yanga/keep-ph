"use client";

import { Box, Center, Text } from "@mantine/core";

export default function SiteFooter() {
  return (
    <Box component="footer" py="md" style={{ borderTop: "1px solid #e5e7eb" }}>
      <Center>
        <Text size="sm" color="#6B7280">
          © 2025 Keep PH. All rights reserved.
        </Text>
      </Center>
    </Box>
  );
}
