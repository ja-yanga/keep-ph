"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { resetRouteProgress } from "@/lib/route-progress";
import "./TopLoaderProvider.css";

function TopLoaderProviderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setTimeout(() => {
      resetRouteProgress();
    }, 0);
  }, [pathname, searchParams]);

  return null;
}

export default function TopLoaderProvider() {
  return (
    <Suspense fallback={null}>
      <TopLoaderProviderInner />
    </Suspense>
  );
}
