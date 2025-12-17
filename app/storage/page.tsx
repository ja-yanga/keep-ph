import {Box, Container} from "@mantine/core";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import AllStorageFiles from "@/components/AllStorageFiles";

export default function AllStoragePage() {
  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#F7FAFC",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DashboardNav />
      <main style={{flex: 1}}>
        <Container size="xl" py="xl">
          <AllStorageFiles />
        </Container>
      </main>
      <Footer />
    </Box>
  );
}
