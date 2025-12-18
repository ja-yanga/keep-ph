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
  user_role?: string | null;
  users_role?: string | null;
  needs_onboarding?: boolean | string | null;
  avatar_url?: string | null;
  users_avatar_url?: string | null;
  referral_code?: string | null;
  users_referral_code?: string | null;
} | null;

type UserPayload = {
  id?: string;
  email?: string;
  // new-schema aliases
  users_id?: string;
  users_email?: string;
} | null;

type KycPayload = {
  status?: string | null;
  user_kyc_status?: string | null;
} | null;

type SessionPayload = {
  ok?: boolean;
  user?: UserPayload;
  profile?: Profile;
  role?: string | null;
  kyc?: KycPayload | null;
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

export function SessionProvider({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession?: SessionPayload | null;
}) {
  // hydrate from server-provided session when available
  const [session, setSession] = useState<SessionPayload>(
    initialSession ?? null,
  );
  const [loading, setLoading] = useState<boolean>(
    initialSession ? false : true,
  );
  const [error, setError] = useState<unknown>(null);

  const normalizeUser = (raw: unknown): UserPayload | null => {
    if (!raw || typeof raw !== "object") return null;
    const rec = raw as Record<string, unknown>;
    return {
      id: (rec.id as string) ?? (rec.users_id as string) ?? undefined,
      email: (rec.email as string) ?? (rec.users_email as string) ?? undefined,
      users_id: rec.users_id as string | undefined,
      users_email: rec.users_email as string | undefined,
    };
  };

  const normalizeProfile = (raw: unknown): Profile | null => {
    if (!raw || typeof raw !== "object") return null;
    const rec = raw as Record<string, unknown>;
    return {
      first_name: (rec.first_name as string) ?? null,
      last_name: (rec.last_name as string) ?? null,
      user_role:
        (rec.user_role as string) ?? (rec.users_role as string) ?? null,
      users_role: (rec.users_role as string) ?? null,
      avatar_url:
        (rec.avatar_url as string) ?? (rec.users_avatar_url as string) ?? null,
      referral_code:
        (rec.referral_code as string) ??
        (rec.users_referral_code as string) ??
        null,
      needs_onboarding:
        typeof rec.needs_onboarding === "boolean"
          ? (rec.needs_onboarding as boolean)
          : ((rec.needs_onboarding as string) ?? null),
    };
  };

  const normalizeKyc = (raw: unknown): KycPayload | null => {
    if (!raw || typeof raw !== "object") return null;
    const rec = raw as Record<string, unknown>;
    return {
      status:
        (rec.status as string) ??
        (rec.user_kyc_status as string) ??
        (rec.user_kyc_status as string) ??
        null,
      user_kyc_status: (rec.user_kyc_status as string) ?? null,
    };
  };

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

      if (!res.ok) {
        const bodyText = await res.text().catch(() => null);
        setSession(null);
        setError({ status: res.status, body: bodyText });
        return;
      }

      const data = await res.json().catch(() => null);

      const rawUser = data?.user ?? null;
      const rawProfile = data?.profile ?? null;
      const rawKyc = data?.kyc ?? null;

      const normalized = {
        ok: Boolean(data?.ok ?? true),
        user: normalizeUser(rawUser),
        profile: normalizeProfile(rawProfile),
        role:
          (data?.role as string) ??
          (rawProfile &&
            ((rawProfile as Record<string, unknown>).user_role as string)) ??
          (rawProfile &&
            ((rawProfile as Record<string, unknown>).users_role as string)) ??
          null,
        kyc: normalizeKyc(rawKyc),
        isKycVerified:
          (rawKyc &&
            ((rawKyc as Record<string, unknown>).status === "VERIFIED" ||
              (rawKyc as Record<string, unknown>).user_kyc_status ===
                "VERIFIED")) ??
          Boolean(data?.isKycVerified),
      } as SessionPayload;

      setSession(normalized);
    } catch (err: unknown) {
      console.error("[SessionProvider] session fetch error:", err);
      setSession(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // only fetch if we don't have initial data
    if (!initialSession) {
      void fetchSession();
    }
    // include initialSession in deps to satisfy lint rules
  }, [initialSession]);

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
