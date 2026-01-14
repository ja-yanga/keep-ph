import "@testing-library/jest-dom";

// Suppress React act() warnings in tests (these are expected with async operations and third-party components)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = typeof args[0] === "string" ? args[0] : "";
    // Suppress act() related warnings from React and React Testing Library
    if (
      message.includes(
        "The current testing environment is not configured to support act",
      ) ||
      message.includes("was not wrapped in act(...)") ||
      (message.includes("An update to") &&
        message.includes("inside a test was not wrapped in act"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Only setup window.matchMedia if window exists (i.e., in jsdom environment)
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
