import { Box } from "@mantine/core";
import Footer from "./Footer";
import PublicNavigationHeader from "./PublicNavigationHeader";

const PublicMainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#F8F9FA",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PublicNavigationHeader />
      {children}
      <Footer />
    </Box>
  );
};

export default PublicMainLayout;
