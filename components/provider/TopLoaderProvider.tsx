"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { doneRouteProgress } from "@/lib/route-progress";
import "./TopLoaderProvder.css";

export default function TopLoaderProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setTimeout(() => {
      doneRouteProgress();
    }, 0);
  }, [pathname, searchParams]);

  return null;
}
