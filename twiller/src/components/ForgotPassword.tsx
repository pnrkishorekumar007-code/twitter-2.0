"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import axiosInstance from "@/lib/axiosInstance";

export default function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<"request" | "verify" | "done">("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const requestReset = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/forgot-password/request", { identifier });
      setDevCode(res.data?.devCode);
      setStep("verify");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndReset = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/forgot-password/verify", { identifier, code });
      setNewPassword(res.data.newPassword);
      setStep("done");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-white space-y-4">
      <h2 className="text-2xl font-bold">Reset your password</h2>

      {step === "request" && (
        <>
          <p className="text-gray-400 text-sm">Enter your registered email or phone number.</p>
          <Input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email or phone number"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading} onClick={requestReset}>
            {loading ? "Sending..." : "Send OTP"}
          </Button>
        </>
      )}

      {step === "verify" && (
        <>
          <p className="text-gray-400 text-sm">Enter the 6-digit code emailed to you.</p>
          {devCode && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-center">
              <p className="text-gray-400 text-xs">Dev mode — email not configured. Your code:</p>
              <p className="text-white text-lg font-bold tracking-widest">{devCode}</p>
            </div>
          )}
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" maxLength={6} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading} onClick={verifyAndReset}>
            {loading ? "Verifying..." : "Verify & generate new password"}
          </Button>
        </>
      )}

      {step === "done" && (
        <>
          <p className="text-gray-300">Your new password:</p>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 font-mono text-lg tracking-wider">
            {newPassword}
          </div>
          <p className="text-gray-400 text-sm">
            Save this somewhere safe, then log in with it. You can change it again from your profile.
          </p>
        </>
      )}

      <button className="text-blue-400 text-sm hover:underline" onClick={onBack}>
        ← Back to log in
      </button>
    </div>
  );
}
