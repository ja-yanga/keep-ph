import { Box } from "@mantine/core";
import Footer from "./Footer";
import PrivateNavigationHeader from "./PrivateNavigationHeader";

const PrivateMainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Box
        style={{
          minHeight: "100dvh",
          backgroundColor: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <PrivateNavigationHeader />
        {children}
        <Footer />
      </Box>
    </>
  );
};

export default PrivateMainLayout;
