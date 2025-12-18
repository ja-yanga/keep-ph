import {Box} from "@mantine/core";
import DashboardNav from "../../components/DashboardNav";
import Footer from "@/components/Footer";
import DashboardContent from "@/components/DashboardContent";

export default function DashboardPage() {
  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DashboardNav />
      <DashboardContent />
      <Footer />
    </Box>
  );
}
