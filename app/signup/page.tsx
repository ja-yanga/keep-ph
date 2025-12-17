import {Box} from "@mantine/core";
import Nav from "../../components/Nav";
import SiteFooter from "../../components/Footer";
import SignUpForm from "@/components/SignUpForm";

export default function SignUpPage() {
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
      <SignUpForm />
      <SiteFooter />
    </Box>
  );
}
