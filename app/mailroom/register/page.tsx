import { Box, Container, Title } from "@mantine/core";
import { redirect } from "next/navigation";

import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import RegisterForm from "@/components/RegisterForm";
import { user_is_verified } from "@/app/actions/get";

export default async function RegisterMailroomPage() {
  const kycStatus = await user_is_verified();

  if (kycStatus !== "VERIFIED") {
    redirect("/mailroom/kyc");
  }

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
          <RegisterForm />
        </Container>
      </main>
      <Footer />
    </Box>
  );
}
