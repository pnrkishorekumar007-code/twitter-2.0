"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Upload, Trash2, AudioLines, Clock } from "lucide-react";
import { Button } from "./ui/button";
import OtpModal from "./OtpModal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  isAudioWindowOpen,
  getIstTimeLabel,
  verifyOtp,
  consumeOtp,
} from "@/lib/otp";

interface AudioRecorderProps {
  onAudioChange: (audio: { url: string; name: string; duration: number } | null) => void;
}

export default function AudioRecorder({ onAudioChange }: AudioRecorderProps) {
  const { t, tf } = useLanguage();
  const { user } = useAuth();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audio, setAudio] = useState<{ url: string; name: string; duration: number } | null>(null);
  const [error, setError] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDuration, setPendingDuration] = useState(0);
  const [windowOpen, setWindowOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWindowOpen(isAudioWindowOpen());
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setError("");
    if (!user) return;
    setShowOtp(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      stream.getTracks().forEach((track) => track.stop());
      finalizeBlob(blob, elapsed);
    };
    recorder.start();
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 > 300) {
          stopRecording();
          return e;
        }
        return e + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const finalizeBlob = (blob: Blob, duration: number) => {
    if (duration > 300) {
      setError(t("audio.invalidDuration"));
      return;
    }
    if (blob.size > 100 * 1024 * 1024) {
      setError(t("audio.invalidSize"));
      return;
    }
    const url = URL.createObjectURL(blob);
    setAudio({ url, name: `recording-${Date.now()}.webm`, duration });
    onAudioChange({ url, name: `recording-${Date.now()}.webm`, duration });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!user) return;

    if (file.size > 100 * 1024 * 1024) {
      setError(t("audio.invalidSize"));
      return;
    }
    const dur = await getAudioDuration(file);
    if (dur > 300) {
      setError(t("audio.invalidDuration"));
      return;
    }
    setPendingFile(file);
    setPendingDuration(Math.round(dur));
    setShowOtp(true);
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const el = new Audio(URL.createObjectURL(file));
      el.onloadedmetadata = () => {
        resolve(el.duration);
        URL.revokeObjectURL(el.src);
      };
      el.onerror = () => resolve(0);
    });
  };

  const handleOtpVerify = (otp: string): boolean => {
    if (verifyOtp(otp)) {
      consumeOtp();
      setShowOtp(false);
      if (pendingFile) {
        finalizeBlob(pendingFile, pendingDuration);
        setPendingFile(null);
      }
      return true;
    }
    return false;
  };

  const removeAudio = () => {
    if (audio) URL.revokeObjectURL(audio.url);
    setAudio(null);
    onAudioChange(null);
  };

  if (!windowOpen) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
        <p className="text-red-300 text-sm font-semibold flex items-center">
          <Clock className="h-4 w-4 mr-2" /> {t("audio.windowClosed")}
        </p>
        <p className="text-gray-400 text-xs mt-1">{t("audio.windowClosedText")}</p>
        <p className="text-blue-300 text-xs mt-1">IST: {getIstTimeLabel()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-3">
        <p className="text-sm text-gray-400 flex items-center mb-2">
          <AudioLines className="h-4 w-4 text-blue-400 mr-2" />
          {t("audio.limitTitle")}: {t("audio.limitText")}
        </p>

        {audio ? (
          <div className="flex items-center space-x-3">
            <audio controls src={audio.url} className="flex-1 h-10" />
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
              onClick={removeAudio}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : recording ? (
          <div className="flex items-center justify-between p-3">
            <span className="text-red-400 flex items-center font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
              {t("audio.recording")} {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500 text-red-400"
              onClick={stopRecording}
            >
              <Square className="h-4 w-4 mr-2" />
              {t("audio.stop")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 text-white hover:bg-gray-800"
              onClick={startRecording}
            >
              <Mic className="h-4 w-4 mr-2 text-red-400" />
              {t("audio.record")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 text-white hover:bg-gray-800"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2 text-blue-400" />
              {t("audio.upload")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      <OtpModal
        isOpen={showOtp}
        onClose={() => {
          setShowOtp(false);
          setPendingFile(null);
          consumeOtp();
        }}
        target={user?.email || ""}
        channel="email"
        title={t("audio.otpRequired")}
        subtitle={t("audio.otpRequiredText")}
        onVerify={handleOtpVerify}
      />
    </div>
  );
}
