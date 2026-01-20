import { memo } from "react";
import { Box } from "@mantine/core";
import Footer from "./Footer";
import PrivateNavigationHeader from "./PrivateNavigationHeader";

const LAYOUT_STYLE = {
  minHeight: "100dvh",
  backgroundColor: "#FFFFFF",
  display: "flex",
  flexDirection: "column" as const,
};

function PrivateMainLayoutComponent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box component="div" style={LAYOUT_STYLE}>
      <PrivateNavigationHeader />
      {children}
      <Footer />
    </Box>
  );
}

export default memo(PrivateMainLayoutComponent);
