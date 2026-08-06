"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Landing from "@/components/Landing";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

  return <Landing />;
}
