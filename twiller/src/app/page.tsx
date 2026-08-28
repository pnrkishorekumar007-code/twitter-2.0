"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Landing from "@/components/Landing";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/home");
    }
  }, [user, isLoading, router]);

  // Derive whether to show landing — no extra state needed.
  const showLanding = useMemo(() => !isLoading && !user, [isLoading, user]);

  // While checking auth, render nothing to avoid a flash of the landing page.
  if (isLoading) {
    return <div className="min-h-dvh bg-black" />;
  }

  if (!showLanding) return null;

  return <Landing />;
}
