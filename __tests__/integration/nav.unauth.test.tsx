import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Nav from "@/components/Nav";
import { MantineProvider } from "@mantine/core";

jest.setTimeout(10000);

const pushMock = jest.fn();
const usePathnameMock = jest.fn();

// Mock next/navigation used by Nav
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => usePathnameMock(),
}));

/**
 * Integration tests for unauthenticated Nav component.
 *
 * Covers:
 * - rendering of public links (Services, Pricing, Login, Sign Up)
 * - anchor navigation behavior:
 *   * when pathname !== "/" -> router.push('/#id')
 *   * when pathname === "/" -> element.scrollIntoView()
 */

describe("Unauthenticated Nav", () => {
  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("renders public links and sign up button", () => {
    usePathnameMock.mockReturnValue("/other");
    render(
      <MantineProvider>
        <Nav />
      </MantineProvider>,
    );

    expect(screen.getByRole("link", { name: /Services/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Pricing/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Login/i })).toHaveAttribute(
      "href",
      "/signin",
    );
    // Sign Up is rendered as a Link-backed button -> appears as a link
    expect(screen.getByRole("link", { name: /Sign Up/i })).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  it("pushes router to hashed route when not on root", async () => {
    usePathnameMock.mockReturnValue("/dashboard");
    render(
      <MantineProvider>
        <Nav />
      </MantineProvider>,
    );

    await userEvent.click(screen.getByRole("link", { name: /Services/i }));
    expect(pushMock).toHaveBeenCalledWith("/#services");

    await userEvent.click(screen.getByRole("link", { name: /Pricing/i }));
    expect(pushMock).toHaveBeenCalledWith("/#pricing");
  });

  it("scrolls into view when on root path", async () => {
    usePathnameMock.mockReturnValue("/");
    // create target element for "pricing" id and spy on scrollIntoView
    const el = document.createElement("div");
    el.id = "pricing";
    el.scrollIntoView = jest.fn();
    document.body.appendChild(el);

    render(
      <MantineProvider>
        <Nav />
      </MantineProvider>,
    );

    await userEvent.click(screen.getByRole("link", { name: /Pricing/i }));
    expect(
      (document.getElementById("pricing") as HTMLElement).scrollIntoView,
    ).toHaveBeenCalled();
  });

  it("auth links: Login and Sign Up point to correct pages and do not call router.push", async () => {
    // when not on root, auth links are simple anchors pointing to /signin and /signup
    usePathnameMock.mockReturnValue("/other");
    render(
      <MantineProvider>
        <Nav />
      </MantineProvider>,
    );

    const loginLink = screen.getByRole("link", { name: /Login/i });
    const signUpLink = screen.getByRole("link", { name: /Sign Up/i });

    // links have correct hrefs
    expect(loginLink).toHaveAttribute("href", "/signin");
    expect(signUpLink).toHaveAttribute("href", "/signup");

    // clicking auth links shouldn't call router.push (they are anchors)
    await userEvent.click(loginLink);
    await userEvent.click(signUpLink);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
