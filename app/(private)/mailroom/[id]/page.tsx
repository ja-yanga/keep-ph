"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { MailroomPackageViewItem } from "@/utils/types";
import MailroomPackageView from "@/components/pages/customer/MailroomPage/MailroomPackageView";

export default function MailroomPackagePage() {
  const params = useParams();
  // const router = useRouter();
  const id = params?.id ?? "";
  const [item, setItem] = useState<MailroomPackageViewItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          API_ENDPOINTS.mailroom.registration(id as string),
          {
            credentials: "include",
          },
        );
        if (!response.ok) {
          const listRes = await fetch(API_ENDPOINTS.mailroom.registrations, {
            credentials: "include",
          });
          if (!listRes.ok) throw new Error("Failed to load registrations");
          const json = await listRes.json();
          const rows = Array.isArray(json?.data ?? json)
            ? (json.data ?? json)
            : [];
          const found = rows.find(
            (r: { id: string | number }) => String(r.id) === String(id),
          );
          if (!mounted) return;
          if (!found) {
            setError("Mailroom registration not found");
            setItem({} as MailroomPackageViewItem);
            return;
          }
          setItem(found);
          return;
        }
        const json = await response.json().catch(() => ({}));
        if (!mounted) return;
        setItem(json?.data ?? json ?? null);
      } catch (err: unknown) {
        console.error(err);
        if (mounted)
          setError(
            (err instanceof Error ? err.message : null) ?? "Failed to load",
          );
        setItem(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  console.log("item", item);

  return <MailroomPackageView item={item} loading={loading} error={error} />;
}
