import { Box } from "@mantine/core";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import AccountContent from "@/components/AccountContent";

export default function AccountPage() {
  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#F8FAFC",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DashboardNav />
      <AccountContent />
      <Footer />
    </Box>
  );
}
