import { Box } from "@mantine/core";
import DashboardNav from "../../../components/DashboardNav";
import Footer from "@/components/Footer";
import DashboardContent from "@/components/DashboardContent";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { fetchFromAPI } from "@/utils/fetcher";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

type RegistrationsResponse = {
  data: unknown[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
};

export default async function DashboardPage() {
  await getAuthenticatedUser();

  let registrations: unknown[] = [];
  try {
    const response = await fetchFromAPI<RegistrationsResponse>(
      API_ENDPOINTS.mailroom.registrations,
    );
    registrations = response.data ?? [];
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
