import {Box} from "@mantine/core";
import Nav from "../../components/Nav";
import SiteFooter from "../../components/Footer";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#F8F9FA",
        fontFamily: "Manrope, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Nav />
      <ForgotPasswordForm />
      <SiteFooter />
    </Box>
  );
}
