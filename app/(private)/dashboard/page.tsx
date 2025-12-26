import { Box } from "@mantine/core";
import DashboardNav from "../../../components/DashboardNav";
import Footer from "@/components/Footer";
import DashboardContent from "@/components/DashboardContent";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getMailroomRegistrations } from "@/app/actions/get";

export default async function DashboardPage() {
  const { user } = await getAuthenticatedUser();

  let registrations: unknown[] = [];
  try {
    registrations = await getMailroomRegistrations(user.id);
  } catch (error) {
    console.error("Error fetching mailroom registrations:", error);
    registrations = [];
  }

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
      <DashboardContent initialRegistrations={registrations} />
      <Footer />
    </Box>
  );
}
