"use client";
import React from "react";
import MailroomLocations from "@/components/MailroomLocations";
import { Box, Container, Title } from "@mantine/core";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";

export default function LocationsPage() {
  return (
    <>
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
              Register Mailroom Locations
            </Title>
            <MailroomLocations />
          </Container>
        </main>
        <Footer />
      </Box>
    </>
  );
}
