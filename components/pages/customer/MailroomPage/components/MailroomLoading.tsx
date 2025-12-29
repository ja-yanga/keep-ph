import { Box, Container, Loader } from "@mantine/core";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";

export default function MailroomLoading() {
  return (
    <Box
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F8F9FA",
      }}
    >
      <DashboardNav />
      <Container py="xl" size="xl">
        <Loader />
      </Container>
      <Footer />
    </Box>
  );
}
