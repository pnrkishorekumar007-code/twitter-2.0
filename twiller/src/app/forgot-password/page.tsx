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
      <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
        {/* Ambient brand background */}
        <div
          className="absolute inset-0 opacity-30 bg-brand-gradient animate-gradient"
          style={{ filter: "blur(120px)" }}
        />
        <div className="absolute top-1/4 right-1/4 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl animate-float-slow" />

        <div className="relative flex flex-col items-center justify-center flex-1 px-4 py-10">
          <Link href="/" aria-label="Twiller home" className="mb-8">
            <TwillerBrand />
          </Link>

          <Card className="w-full max-w-md bg-black border-gray-800 shadow-2xl shadow-black/60">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center h-10 w-10 rounded-full bg-brand-gradient animate-gradient text-white shadow-lg shadow-brand/40">
                  <Lock className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
              </div>

              <ForgotPassword />
            </CardContent>
          </Card>

          <p className="text-xs text-gray-500 mt-6">
            © 2026 Twiller ·{" "}
            <Link href="/" className="hover:text-gray-300 hover:underline">
              Back to Twiller
            </Link>
          </p>
        </div>
      </div>
    </ToastProvider>
  );
}
