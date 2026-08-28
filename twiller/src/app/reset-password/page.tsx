import type { Metadata } from "next";
import Link from "next/link";
import ResetPassword from "@/components/ResetPassword";
import { TwillerBrand } from "@/components/Twitterlogo";
import { ToastProvider } from "@/components/Toast";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Reset Password - Twiller",
  description:
    "Enter your verification code to reset your Twiller account password.",
};

export default function ResetPasswordPage() {
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
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <h1 className="text-2xl font-bold text-white">Reset Password</h1>
              </div>

              <ResetPassword />
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
