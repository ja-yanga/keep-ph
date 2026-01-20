import React from "react";
import { SessionProvider } from "./SessionProvider";

// Note: this is a server component
export default function ServerSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Avoid blocking the initial document request with a server-side session fetch.
  // The client SessionProvider will hydrate itself after load.
  return <SessionProvider initialSession={null}>{children}</SessionProvider>;
}
