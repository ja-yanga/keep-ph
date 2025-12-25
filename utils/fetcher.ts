export async function fetchFromAPI<T>(
  url: string,
  options?: {
    forwardCookies?: boolean;
    method?: "GET" | "POST" | "PUT";
    body?: unknown;
    cache?: RequestCache;
  },
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!base && typeof window === "undefined") {
    console.warn(
      "NEXT_PUBLIC_BASE_URL is missing. Server-side fetch might fail.",
    );
  }

  const forwardCookies = options?.forwardCookies ?? true;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (forwardCookies) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    headers.cookie = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`) // Values from getAll() are already safe
      .join("; ");
  }

  const response = await fetch(`${base ?? ""}${url}`, {
    method: options?.method ?? "GET",
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: options?.cache ?? "no-store",
  });

  if (!response.ok) {
    // Try to parse the error message from the body
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: response.statusText };
    }

    throw new Error(
      errorData.error || `Request failed with status ${response.status}`,
    );
  }

  return response.json();
}
