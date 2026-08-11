"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import AuthModal from "./Authmodel";
import TwitterLogo, { TwillerBrand } from "./Twitterlogo";
import { useAuth } from "@/context/AuthContext";
import Feed from "./Feed";
import { Sparkles } from "lucide-react";

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const { user, googlesignin } = useAuth();

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };
  if (user) {
    return <Feed />;
  }
  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden">
      {/* Left side - animated logo */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 bg-brand-gradient animate-gradient"
          style={{ filter: "blur(120px)" }}
        />
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl animate-float-slow" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative animate-float">
          <TwitterLogo
            variant="gradient"
            size="xl"
            className="h-64 w-64 lg:h-80 lg:w-80 drop-shadow-[0_0_80px_rgba(129,140,248,0.55)]"
          />
        </div>
      </div>

      {/* Right side - Content */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 max-w-lg lg:max-w-2xl">
        <div className="lg:hidden mb-8">
          <TwillerBrand />
        </div>

        <div className="space-y-12">
          <div>
            <h1 className="text-5xl lg:text-7xl font-extrabold mb-4 leading-[1.05] tracking-tight animate-fade-up">
              Happening{" "}
              <span className="bg-brand-gradient bg-clip-text text-transparent">
                now
              </span>
            </h1>
            <h2 className="text-2xl lg:text-3xl font-bold mb-3 animate-fade-up [animation-delay:100ms]">
              Join Twiller today.
            </h2>
            <p className="text-gray-400 flex items-center gap-1.5 animate-fade-up [animation-delay:150ms]">
              <Sparkles className="h-4 w-4 text-brand" /> Your timeline, your
              voice.
            </p>
          </div>

          <div className="space-y-4 max-w-xs animate-fade-up [animation-delay:200ms]">
            <Button
              variant="outline"
              className="w-full py-3 rounded-full border-white/15 bg-white/5 text-white font-semibold text-base h-12 hover:bg-white/10 hover:border-white/25 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/5 transition-all"
              onClick={() => googlesignin()}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google
            </Button>

            <Button
              variant="outline"
              className="w-full py-3 rounded-full border-white/15 bg-white/5 text-white font-semibold text-base h-12 hover:bg-white/10 hover:border-white/25 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/5 transition-all"
              onClick={() => openAuthModal("signup")}
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Sign up with Apple
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black px-2 text-gray-500">or</span>
              </div>
            </div>
            <Button
              className="w-full bg-brand-gradient animate-gradient text-white font-bold py-3 rounded-full text-base h-12 shadow-lg shadow-brand/40 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/40 transition-all"
              onClick={() => openAuthModal("signup")}
            >
              Create account
            </Button>
            <p className="text-xs text-gray-500 leading-relaxed">
              By signing up, you agree to the{" "}
              <a href="#" className="text-brand hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-brand hover:underline">
                Privacy Policy
              </a>
              , including{" "}
              <a href="#" className="text-brand hover:underline">
                Cookie Use
              </a>
              .
            </p>
          </div>
          <div className="space-y-5 animate-fade-up [animation-delay:250ms]">
            <p className="text-lg font-bold">Already have an account?</p>
            <Button
              variant="outline"
              className="w-full max-w-xs py-3 rounded-full border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 text-brand font-semibold text-base h-12 hover:-translate-y-0.5 transition-all"
              onClick={() => openAuthModal("login")}
            >
              Log in
            </Button>
          </div>
        </div>

        <footer className="hidden lg:flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 mt-14 pt-6 border-t border-white/10 max-w-xs">
          <span>© 2026 Twiller</span>
          <a href="#" className="hover:text-gray-300 hover:underline">About</a>
          <a href="#" className="hover:text-gray-300 hover:underline">Help</a>
          <a href="#" className="hover:text-gray-300 hover:underline">Privacy</a>
          <a href="#" className="hover:text-gray-300 hover:underline">Terms</a>
          <a href="#" className="hover:text-gray-300 hover:underline">Cookies</a>
        </footer>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </div>
  );
}
