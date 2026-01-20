import { startRouteProgress, doneRouteProgress } from "./route-progress";

export async function fetchWithLoader(input: RequestInfo, init?: RequestInit) {
  const method = (init?.method || "GET").toUpperCase();

  const shouldStart = method === "GET";

  if (shouldStart) startRouteProgress();

  try {
    return await fetch(input, init);
  } finally {
    if (shouldStart) doneRouteProgress();
  }
}
