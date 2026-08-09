"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface OtpModalProps {
  open: boolean;
  title: string;
  description: string;
  onVerify: (code: string) => Promise<void>;
  onClose: () => void;
}

export default function OtpModal({ open, title, description, onVerify, onClose }: OtpModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleVerify = async () => {
    setLoading(true);
    setError("");
    try {
      await onVerify(code);
      setCode("");
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-black border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-white text-xl font-bold mb-1">{title}</h3>
        <p className="text-gray-400 text-sm mb-4">{description}</p>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6-digit code"
          maxLength={6}
          className="mb-2 text-white"
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-blue-500 hover:bg-blue-600"
            disabled={loading || code.length !== 6}
            onClick={handleVerify}
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </div>
    </div>
  );
}
