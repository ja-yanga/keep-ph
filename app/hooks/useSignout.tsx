import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useSignout() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      await supabase.auth.signOut();
      router.push("/signin");
    } catch (err) {
      console.error("signout error:", err);
      alert("Could not sign out. See console for details.");
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  return { handleSignOut, loading };
}
