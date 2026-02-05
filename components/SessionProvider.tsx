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
  mobile_number?: string | null;
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
      id:
        (typeof rec.id === "string" ? rec.id : null) ??
        (typeof rec.users_id === "string" ? rec.users_id : null) ??
        undefined,
      email:
        (typeof rec.email === "string" ? rec.email : null) ??
        (typeof rec.users_email === "string" ? rec.users_email : null) ??
        undefined,
      users_id: typeof rec.users_id === "string" ? rec.users_id : undefined,
      users_email:
        typeof rec.users_email === "string" ? rec.users_email : undefined,
    };
  };

  const normalizeProfile = (raw: unknown): Profile | null => {
    if (!raw || typeof raw !== "object") return null;
    const rec = raw as Record<string, unknown>;
    return {
      first_name: typeof rec.first_name === "string" ? rec.first_name : null,
      last_name: typeof rec.last_name === "string" ? rec.last_name : null,
      mobile_number:
        typeof rec.mobile_number === "string" ? rec.mobile_number : null,
      user_role:
        (typeof rec.user_role === "string" ? rec.user_role : null) ??
        (typeof rec.users_role === "string" ? rec.users_role : null) ??
        null,
      users_role: typeof rec.users_role === "string" ? rec.users_role : null,
      needs_onboarding: (() => {
        const val = rec.needs_onboarding;
        if (typeof val === "boolean") return val;
        if (typeof val === "string") return val;
        return null;
      })(),
      avatar_url:
        (typeof rec.avatar_url === "string" ? rec.avatar_url : null) ??
        (typeof rec.users_avatar_url === "string"
          ? rec.users_avatar_url
          : null) ??
        null,
      users_avatar_url:
        typeof rec.users_avatar_url === "string" ? rec.users_avatar_url : null,
      referral_code:
        (typeof rec.referral_code === "string" ? rec.referral_code : null) ??
        (typeof rec.users_referral_code === "string"
          ? rec.users_referral_code
          : null) ??
        null,
      users_referral_code:
        typeof rec.users_referral_code === "string"
          ? rec.users_referral_code
          : null,
    };
  };

  const normalizeKyc = (raw: unknown): KycPayload | null => {
    if (!raw || typeof raw !== "object") return null;
    const rec = raw as Record<string, unknown>;
    return {
      status:
        (typeof rec.status === "string" ? rec.status : null) ??
        (typeof rec.user_kyc_status === "string"
          ? rec.user_kyc_status
          : null) ??
        null,
      user_kyc_status:
        typeof rec.user_kyc_status === "string" ? rec.user_kyc_status : null,
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
          (typeof data?.role === "string" ? data.role : null) ??
          (rawProfile &&
          typeof (rawProfile as Record<string, unknown>).user_role === "string"
            ? (rawProfile as Record<string, unknown>).user_role
            : null) ??
          (rawProfile &&
          typeof (rawProfile as Record<string, unknown>).users_role === "string"
            ? (rawProfile as Record<string, unknown>).users_role
            : null) ??
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
