import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import PrivateNavigationHeader from "@/components/Layout/PrivateNavigationHeader";

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/",
}));
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: jest.fn() } }),
}));
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ message: "Signed out successfully" }),
});

test("logout calls signout endpoint, supabase signOut and redirects", async () => {
  render(
    <MantineProvider>
      <PrivateNavigationHeader />
    </MantineProvider>,
  );
  // button now exposes an aria-label "Sign out of your account"
  await userEvent.click(
    screen.getByRole("button", { name: /sign out of your account/i }),
  );
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/signout",
      expect.objectContaining({ method: "POST" }),
    );
    expect(pushMock).toHaveBeenCalledWith("/signin");
  });
});
