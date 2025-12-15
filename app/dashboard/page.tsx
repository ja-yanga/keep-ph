import React, { Suspense } from "react";
import ServerUserDashboard from "@/components/ServerUserDashboard";
import DashboardNav from "../../components/DashboardNav";
import Footer from "@/components/Footer";
import { Box, Container, Loader, Center } from "@mantine/core";

export default async function DashboardPage() {
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
      <Box style={{ flex: 1, paddingTop: 32, paddingBottom: 32 }}>
        <Container size="xl" py="xl">
          <Suspense
            fallback={
              <Center py="xl">
                <Loader />
              </Center>
            }
          >
            <ServerUserDashboard />
          </Suspense>
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}
