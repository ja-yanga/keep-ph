import { Box, Container, Title } from "@mantine/core";
import { redirect } from "next/navigation";
import {
  createClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import RegisterForm from "@/components/RegisterForm";

export default async function RegisterMailroomPage() {
  // Get authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no user, middleware will handle redirect to signin
  if (!user) {
    return null;
  }

  // Check KYC status - this is business logic, not middleware
  try {
    const supabaseAdmin = createSupabaseServiceClient();
    const { data: kyc, error: kycErr } = await supabaseAdmin
      .from("user_kyc_table")
      .select("user_kyc_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (kycErr) {
      console.error("KYC lookup error:", kycErr);
      redirect("/mailroom/kyc");
    }

    if (!kyc || kyc.user_kyc_status !== "VERIFIED") {
      redirect("/mailroom/kyc");
    }
  } catch (error) {
    console.error("Error checking KYC status:", error);
    // On error, fall back to blocking access to be safe
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
