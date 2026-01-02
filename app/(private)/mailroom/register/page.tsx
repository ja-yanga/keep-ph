import { Container, Title } from "@mantine/core";
import { redirect } from "next/navigation";

import RegisterForm from "@/components/pages/customer/MailroomRegistrationPage/RegisterForm";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getUserVerificationStatus } from "@/app/actions/get";
import { fetchFromAPI } from "@/utils/fetcher";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";
import type {
  AvailabilityResponse,
  LocationsResponse,
  MailroomPlan,
} from "@/utils/types";

export default async function RegisterMailroomPage() {
  const { user } = await getAuthenticatedUser();

  const verificationStatus = await getUserVerificationStatus(user.id);

  if (verificationStatus !== "VERIFIED") {
    redirect("/mailroom/kyc");
  }

  // Fetch all data from API endpoints in parallel
  let plans: MailroomPlan[] = [];
  let locations: LocationsResponse["data"] = [];
  let locationAvailability: Record<string, number> = {};

  try {
    const [plansResponse, locationsResponse, availabilityResponse] =
      await Promise.all([
        fetchFromAPI<MailroomPlan[]>(API_ENDPOINTS.mailroom.plans),
        fetchFromAPI<LocationsResponse>(API_ENDPOINTS.mailroom.locations),
        fetchFromAPI<AvailabilityResponse>(
          API_ENDPOINTS.mailroom.locationsAvailability,
        ),
      ]);

    plans = plansResponse;
    locations = locationsResponse.data ?? [];
    locationAvailability = availabilityResponse.data ?? {};
  } catch (error) {
    console.error("Error fetching mailroom registration data:", error);
    // Continue with empty data - RegisterForm will handle it
  }

  // Map to match RegisterForm's expected types
  const formattedPlans = plans.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    description: p.description ?? undefined,
    storage_limit: p.storageLimit ?? undefined,
    can_receive_mail: p.canReceiveMail,
    can_receive_parcels: p.canReceiveParcels,
    can_digitize: p.canDigitize,
  }));

  const formattedLocations = locations.map((l) => ({
    id: l.id,
    name: l.name,
    region: l.region ?? undefined,
    city: l.city ?? undefined,
    barangay: l.barangay ?? undefined,
    zip: l.zip ?? undefined,
  }));

  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={2} mb="lg">
            Register Mailroom Service
          </Title>
          <RegisterForm
            initialPlans={formattedPlans}
            initialLocations={formattedLocations}
            initialLocationAvailability={locationAvailability}
          />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
