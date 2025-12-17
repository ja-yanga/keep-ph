import {Box} from "@mantine/core";
import Nav from "../../components/Nav";
import SiteFooter from "../../components/Footer";
import UpdatePasswordForm from "@/components/UpdatePasswordForm";

export default function UpdatePasswordPage() {
  return (
    <Box
      bg="gray.0"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Nav />
      <UpdatePasswordForm />
      <SiteFooter />
    </Box>
  );
}
