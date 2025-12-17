import {Box} from "@mantine/core";
import Nav from "../../components/Nav";
import SiteFooter from "../../components/Footer";
import SignInForm from "@/components/SignInForm";

export default function SignInPage() {
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
      <SignInForm />
      <SiteFooter />
    </Box>
  );
}
