import DashboardContent from "@/components/DashboardContent";
// import { getAuthenticatedUser } from "@/lib/supabase/server";
import { fetchFromAPI } from "@/utils/fetcher";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

type RegistrationsResponse = {
  data: unknown[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
};

export default async function DashboardPage() {
  // await getAuthenticatedUser();

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
    <PrivateMainLayout>
      <DashboardContent initialRegistrations={registrations} />
    </PrivateMainLayout>
  );
}
