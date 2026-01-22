import { Container } from "@mantine/core";
import dynamic from "next/dynamic";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

// Dynamically import AllStorageFiles to reduce initial bundle size
const AllStorageFiles = dynamic(() => import("@/components/AllStorageFiles"), {
  loading: () => (
    <Container size="xl" py="xl">
      <div
        style={{ display: "flex", justifyContent: "center", padding: "2rem" }}
      >
        Loading...
      </div>
    </Container>
  ),
  ssr: true, // Keep SSR for SEO
});

export default function AllStoragePage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <AllStorageFiles />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
