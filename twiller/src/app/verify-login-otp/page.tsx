import { Suspense } from "react";
import type { Metadata } from "next";
import VerifyLoginOtp from "@/components/VerifyLoginOtp";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Verify Login - Twiller",
  description: "Enter the one-time code sent to your email to complete your login.",
};

function LoadingFallback() {
  return (
    <div className="min-h-dvh bg-black text-white flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
    </div>
  );
}

export default function VerifyLoginOtpPage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<LoadingFallback />}>
          <VerifyLoginOtp />
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
}
