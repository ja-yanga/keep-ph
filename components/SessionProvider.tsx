"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Profile = {
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  needs_onboarding?: string | null;
  avatar_url?: string | null;
} | null;

type SessionPayload = {
  ok?: boolean;
  user?: any;
  profile?: Profile;
  role?: string | null;
  kyc?: { status?: string } | null;
  isKycVerified?: boolean;
} | null;

type ContextValue = {
  session: SessionPayload;
  loading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<ContextValue>({
  session: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionPayload>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const fetchSession = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal,
      });

      // debug: log status and headers info
      console.log("[SessionProvider] /api/onboarding response", {
        status: res.status,
        ok: res.ok,
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => null);
        console.warn(
          "[SessionProvider] session fetch failed:",
          res.status,
          bodyText
        );
        setSession(null);
        setError({ status: res.status, body: bodyText });
        return;
      }

      const data = await res.json();
      // debug: log session payload (don't leak secrets in prod)
      console.log("[SessionProvider] session payload:", data);
      // normalize minimal shape to avoid undefined access in consumers
      setSession({
        ok: data?.ok ?? false,
        user: data?.user ?? null,
        profile: data?.profile ?? null,
        role: data?.role ?? null,
        kyc: data?.kyc ?? null,
        isKycVerified: Boolean(data?.isKycVerified),
      });
    } catch (err: any) {
      console.error("[SessionProvider] session fetch error:", err);
      setSession(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  return (
    <SessionContext.Provider
      value={{ session, loading, error, refresh: fetchSession }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
