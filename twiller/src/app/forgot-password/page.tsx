import type { Metadata } from "next";
import Link from "next/link";
import ForgotPassword from "@/components/ForgotPassword";
import { TwillerBrand } from "@/components/Twitterlogo";
import { ToastProvider } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Forgot Password - Twiller",
  description: "Reset your Twiller account password using your email or phone number.",
};

export default function ForgotPasswordPage() {
  return (
    <ToastProvider>
      <div className="min-h-dvh bg-black text-white flex flex-col">
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-10">
          <Link href="/" aria-label="Twiller home" className="mb-8">
            <TwillerBrand />
          </Link>

          <Card className="w-full max-w-md">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center h-10 w-10 rounded-full bg-brand text-white">
                  <Lock className="h-5 w-5" aria-hidden="true" />
                </span>
                <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
              </div>

              <ForgotPassword />
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground mt-6">
            © 2026 Twiller ·{" "}
            <Link href="/" className="hover:text-foreground hover:underline">
              Back to Twiller
            </Link>
          </p>
        </div>
      </div>
    </ToastProvider>
  );
}
