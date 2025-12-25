import { Box, Container, Title } from "@mantine/core";
import { redirect } from "next/navigation";

import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import RegisterForm from "@/components/RegisterForm";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  getUserVerificationStatus,
  getMailroomPlans,
  getMailroomLocations,
  getLocationAvailability,
} from "@/app/actions/get";

export default async function RegisterMailroomPage() {
  const { user } = await getAuthenticatedUser();

  const verificationStatus = await getUserVerificationStatus(user.id);

  if (verificationStatus !== "VERIFIED") {
    redirect("/mailroom/kyc");
  }

  // Fetch all data from server actions in parallel
  const [plansData, locationsData, locationAvailability] = await Promise.all([
    getMailroomPlans(),
    getMailroomLocations(),
    getLocationAvailability(),
  ]);

  // Map nulls to undefined to match RegisterForm's expected types
  const plans = plansData.map((p) => ({
    ...p,
    description: p.description ?? undefined,
    storage_limit: p.storage_limit ?? undefined,
  }));

  const locations = locationsData.map((l) => ({
    ...l,
    region: l.region ?? undefined,
    city: l.city ?? undefined,
    barangay: l.barangay ?? undefined,
    zip: l.zip ?? undefined,
  }));

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
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={2} mb="lg">
            Register Mailroom Service
          </Title>
          <RegisterForm
            initialPlans={plans}
            initialLocations={locations}
            initialLocationAvailability={locationAvailability}
          />
        </Container>
      </main>
      <Footer />
    </Box>
  );
}
