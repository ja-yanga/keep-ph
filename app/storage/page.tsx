import { Container } from "@mantine/core";
import AllStorageFiles from "@/components/AllStorageFiles";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

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
