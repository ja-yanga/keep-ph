"use client";

import { memo, useMemo } from "react";
import { Box, Center, Text } from "@mantine/core";

const FOOTER_STYLE = { borderTop: "1px solid #dee2e6" };

function FooterComponent() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <Box component="footer" py="md" role="contentinfo" style={FOOTER_STYLE}>
      <Center>
        <Text size="sm" c="gray.8">
          © {currentYear} Keep PH. All rights reserved.
        </Text>
      </Center>
    </Box>
  );
}

export default memo(FooterComponent);
