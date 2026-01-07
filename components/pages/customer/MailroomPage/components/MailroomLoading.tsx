import { Container, Loader } from "@mantine/core";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function MailroomLoading() {
  return (
    <PrivateMainLayout>
      <Container py="xl" size="xl">
        <Loader />
      </Container>
    </PrivateMainLayout>
  );
}
