import {Box} from "@mantine/core";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import ReferralsContent from "@/components/ReferralsContent";

export default function ReferralPage() {
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
      <ReferralsContent />
      <Footer />
    </Box>
  );
}
