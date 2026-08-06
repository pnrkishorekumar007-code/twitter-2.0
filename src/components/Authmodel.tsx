"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Phone,
  ShieldCheck,
} from "lucide-react";
import LoadingSpinner from "./loading-spinner";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { useAuth } from "@/context/AuthContext";
import TwitterLogo from "./Twitterlogo";
import OtpModal from "./OtpModal";
import {
  detectBrowser,
  detectDevice,
  getIstHour,
  getIstTimeLabel,
  verifyOtp,
  consumeOtp,
} from "@/lib/otp";
import { useLanguage } from "@/context/LanguageContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
}: AuthModalProps) {
  const { login, signup, isLoading } = useAuth();
  const { t, tf } = useLanguage();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    displayName: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOtp, setShowOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [deviceBlocked, setDeviceBlocked] = useState(false);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = t("auth.emailRequired");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t("auth.invalidEmail");
    }

    if (!formData.password.trim()) {
      newErrors.password = t("auth.passwordRequired");
    } else if (formData.password.length < 6) {
      newErrors.password = t("auth.passwordLength");
    }

    if (mode === "signup") {
      if (!formData.username.trim()) {
        newErrors.username = t("auth.usernameRequired");
      } else if (formData.username.length < 3) {
        newErrors.username = t("auth.usernameLength");
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = t("auth.usernameInvalid");
      }

      if (!formData.displayName.trim()) {
        newErrors.displayName = t("auth.displayNameRequired");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkDeviceRestriction = () => {
    const device = detectDevice();
    if (device === "mobile") {
      const hour = getIstHour();
      if (hour < 10 || hour >= 13) {
        setDeviceBlocked(true);
        return true;
      }
    }
    setDeviceBlocked(false);
    return false;
  };

  const browserNeedsOtp = () => {
    const browser = detectBrowser();
    if (browser === "Google Chrome") return true;
    if (browser === "Microsoft Edge") return false;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isLoading) return;

    if (checkDeviceRestriction()) return;

    try {
      if (mode === "login") {
        await login(formData.email, formData.password);
        if (browserNeedsOtp()) {
          setShowOtp(true);
          setOtpError("");
          return;
        }
      } else {
        await signup(
          formData.email,
          formData.password,
          formData.username,
          formData.displayName,
          formData.phone
        );
      }
      onClose();
      setFormData({
        email: "",
        password: "",
        username: "",
        displayName: "",
        phone: "",
      });
      setErrors({});
    } catch (error) {
      setErrors({ general: t("auth.authFailed") });
    }
  };

  const handleOtpVerify = (otp: string): boolean => {
    if (verifyOtp(otp)) {
      consumeOtp();
      onClose();
      setShowOtp(false);
      return true;
    }
    setOtpError(t("common.error"));
    return false;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setErrors({});
    setDeviceBlocked(false);
    setFormData({
      email: "",
      password: "",
      username: "",
      displayName: "",
      phone: "",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-black border-gray-800 text-white max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative pb-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-gray-900"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <TwitterLogo size="xl" className="text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {mode === "login" ? t("auth.signInTitle") : t("auth.createTitle")}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {errors.general && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
              {errors.general}
            </div>
          )}

          {deviceBlocked && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <p className="text-red-400 text-sm font-semibold flex items-center">
                <ShieldCheck className="h-4 w-4 mr-2" />
                {t("auth.mobileBlocked")}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {tf("auth.istTime", { time: getIstTimeLabel() })}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-white">
                    {t("auth.displayName")}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder={t("auth.displayNamePlaceholder")}
                      value={formData.displayName}
                      onChange={(e) =>
                        handleInputChange("displayName", e.target.value)
                      }
                      className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.displayName && (
                    <p className="text-red-400 text-sm">{errors.displayName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white">
                    {t("auth.username")}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      @
                    </span>
                    <Input
                      id="username"
                      type="text"
                      placeholder={t("auth.usernamePlaceholder")}
                      value={formData.username}
                      onChange={(e) =>
                        handleInputChange("username", e.target.value)
                      }
                      className="pl-8 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-400 text-sm">{errors.username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white">
                    {t("common.phone")}{" "}
                    <span className="text-gray-500">({t("common.optional")})</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                {t("common.email")}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                {t("common.password")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.passwordPlaceholder")}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className="pl-10 pr-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm">{errors.password}</p>
              )}
            </div>

            {mode === "login" && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-blue-400 hover:text-blue-300 text-sm font-semibold"
                  onClick={onClose}
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-full text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>
                    {mode === "login"
                      ? t("common.loading")
                      : t("common.loading")}
                  </span>
                </div>
              ) : mode === "login" ? (
                t("auth.signIn")
              ) : (
                t("auth.signUp")
              )}
            </Button>
          </form>

          <div className="relative">
            <Separator className="bg-gray-700" />
            <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black px-2 text-gray-400 text-sm">
              {t("landing.or")}
            </span>
          </div>

          <div className="text-center">
            <p className="text-gray-400">
              {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}
              <Button
                variant="link"
                className="text-blue-400 hover:text-blue-300 font-semibold pl-1"
                onClick={switchMode}
                disabled={isLoading}
              >
                {mode === "login" ? t("auth.signUp") : t("auth.signIn")}
              </Button>
            </p>
          </div>

          {mode === "signup" && (
            <div className="text-center text-xs text-gray-400">
              {t("landing.termsText")}
            </div>
          )}
        </CardContent>
      </Card>

      <OtpModal
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        target={formData.email}
        channel="email"
        title={t("common.verify")}
        subtitle={tf("auth.verifyOtp", { target: t("common.email") })}
        onVerify={handleOtpVerify}
      />
    </div>
  );
}
