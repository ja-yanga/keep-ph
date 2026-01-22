import { useMemo } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { useSession } from "@/components/SessionProvider";
import type { RawRow } from "@/utils/types";
import { ApiResponse, MailroomRow, MailroomTotals } from "@/utils/types";
import { trasnformMailroomRow } from "@/utils/transform/mailroom-row";

const REGISTRATIONS_ENDPOINT = "/api/mailroom/registrations";

type FetcherParams = {
  search?: string;
  page?: number;
  limit?: number;
};

/**
 * Fetches mailroom registrations from the API with search and pagination
 */
const fetcher = async (
  url: string,
  params?: FetcherParams,
): Promise<ApiResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const fullUrl = searchParams.toString()
    ? `${url}?${searchParams.toString()}`
    : url;

  const res = await fetch(fullUrl, { method: "GET", credentials: "include" });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}) as Record<string, unknown>);
    const err =
      (json as Record<string, unknown>)?.error ??
      "Failed to load registrations";
    throw new Error(String(err));
  }

  const json = (await res.json()) as Record<string, unknown>;
  const payload = (json.data as unknown) ?? json;

  let rowsArr: RawRow[] = [];
  if (Array.isArray(payload)) {
    rowsArr = payload as RawRow[];
  } else if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as Record<string, unknown>).data)
  ) {
    rowsArr = (payload as Record<string, unknown>).data as unknown as RawRow[];
  }

  const meta =
    json?.meta && typeof json.meta === "object"
      ? (json.meta as Record<string, unknown>)
      : null;

  const stats = meta?.stats as
    | { stored: number; pending: number; released: number }
    | undefined;

  return {
    rows: rowsArr,
    stats,
    pagination: meta?.pagination as
      | { total: number; limit: number; offset: number; has_more: boolean }
      | undefined,
  };
};

/**
 * Hook for fetching and managing mailroom registrations with backend pagination
 */
export const useRegistrations = (
  initialData?: RawRow[] | null,
  search?: string,
  page?: number,
  limit?: number,
) => {
  const { session } = useSession();

  const swrKey = session?.user?.id
    ? [REGISTRATIONS_ENDPOINT, { search, page, limit }]
    : null;

  const fallbackDataObj = useMemo(() => {
    if (initialData && !Array.isArray(initialData)) return undefined;
    if (initialData)
      return { rows: initialData, stats: undefined, total: initialData.length };
    return undefined;
  }, [initialData]);

  const {
    data: apiData,
    error: swrError,
    isLoading,
  } = useSWR<ApiResponse | undefined>(
    swrKey,
    swrKey
      ? ([url, params]) => fetcher(url, params)
      : () => Promise.resolve(undefined),
    {
      revalidateOnFocus: false, // Disable to reduce unnecessary re-fetches on mobile
      revalidateOnReconnect: false, // Disable to reduce blocking
      revalidateIfStale: false, // Use fallback data if available
      fallbackData: fallbackDataObj,
      // Reduce polling and background updates
      dedupingInterval: 2000, // Dedupe requests within 2 seconds
      focusThrottleInterval: 5000, // Throttle focus revalidation
    },
  );

  // Transform data using useMemo instead of useEffect + setState
  const rows = useMemo(() => {
    if (apiData && Array.isArray(apiData.rows)) {
      return trasnformMailroomRow(apiData.rows);
    }
    return null;
  }, [apiData]);

  const totals = useMemo(() => {
    if (apiData && typeof apiData.stats !== "undefined") {
      return apiData.stats;
    }
    return null;
  }, [apiData]);

  const pagination = apiData?.pagination as
    | { total: number; limit: number; offset: number; has_more: boolean }
    | undefined;

  const refresh = (): void => {
    if (swrKey) swrMutate(swrKey);
  };

  const error = swrError ? (swrError as Error).message : null;
  const loading = isLoading;

  return { rows, totals, loading, error, refresh, pagination };
};

/**
 * Hook for filtering mailroom rows (client-side filters only, search is handled by backend)
 * Note: Search is now handled by the backend, this only applies client-side filters
 */
export const useFilteredRows = (
  rows: MailroomRow[] | null,
  filters: {
    plan: string | null;
    location: string | null;
    mailroomStatus: string | null;
  },
) => {
  return useMemo(() => {
    if (!rows) return [];

    return rows.filter((r) => {
      if (filters.plan && r.plan !== filters.plan) return false;
      if (filters.location && r.location !== filters.location) return false;
      if (
        filters.mailroomStatus &&
        r.mailroom_status !== filters.mailroomStatus
      )
        return false;
      return true;
    });
  }, [rows, filters]);
};

/**
 * Hook for calculating aggregated stats
 */
export const useStats = (
  totals: MailroomTotals,
  rows: MailroomRow[] | null,
) => {
  const storedCount = useMemo(() => {
    if (totals) return totals.stored;
    if (rows) return rows.reduce((s, r) => s + r.stats.stored, 0);
    return 0;
  }, [totals, rows]);

  const pendingCount = useMemo(() => {
    if (totals) return totals.pending;
    if (rows) return rows.reduce((s, r) => s + r.stats.pending, 0);
    return 0;
  }, [totals, rows]);

  const releasedCount = useMemo(() => {
    if (totals) return totals.released;
    if (rows) return rows.reduce((s, r) => s + r.stats.released, 0);
    return 0;
  }, [totals, rows]);

  return { storedCount, pendingCount, releasedCount };
};

/**
 * Hook for loading user's first name from KYC data
 * Optimized with SWR for caching and better performance
 */
export const useKycFirstName = () => {
  const { session } = useSession();
  const userId = session?.user?.id;

  const { data: firstName } = useSWR<string | null>(
    userId ? `/api/user/kyc?userId=${encodeURIComponent(userId)}` : null,
    async (url: string) => {
      try {
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) return null;

        const json = await res.json();
        let payload = json?.data ?? json;
        if (payload && typeof payload === "object" && "kyc" in payload) {
          payload = (payload as Record<string, unknown>).kyc as unknown;
        }
        if (Array.isArray(payload) && payload.length > 0) payload = payload[0];

        const first =
          (payload &&
            (payload as Record<string, unknown>)?.user_kyc_first_name) ??
          (payload && (payload as Record<string, unknown>)?.first_name) ??
          (payload && (payload as Record<string, unknown>)?.firstName) ??
          null;

        return first ? String(first) : null;
      } catch {
        return null;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 1 minute
    },
  );

  return firstName ?? null;
};
