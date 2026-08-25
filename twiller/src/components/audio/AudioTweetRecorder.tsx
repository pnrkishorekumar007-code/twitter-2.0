"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Upload, X, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";
import OtpModal from "../otp/OtpModal";
import AudioPlayer from "./AudioPlayer";
import { getErrorMessage } from "@/lib/types";

const MAX_DURATION_SEC = 5 * 60;
const MAX_SIZE_BYTES = 100 * 1024 * 1024;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const AUDIO_WINDOW_OPEN_MIN = 14 * 60; // 2:00 PM IST
const AUDIO_WINDOW_CLOSE_MIN = 19 * 60; // 7:00 PM IST

function getAudioWindowInfo(now = Date.now()) {
  const istDate = new Date(now + IST_OFFSET_MS);
  const minutes = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
  const open = minutes >= AUDIO_WINDOW_OPEN_MIN && minutes < AUDIO_WINDOW_CLOSE_MIN;
  return { open, istDate };
}

function secondsUntilOpen(istDate: Date) {
  const target = new Date(istDate);
  target.setUTCHours(14, 0, 0, 0);
  if (istDate.getUTCHours() >= 14) target.setUTCDate(target.getUTCDate() + 1);
  return Math.max(0, Math.round((target.getTime() - istDate.getTime()) / 1000));
}

function formatCountdown(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}`;
}

export default function AudioTweetRecorder({ onPosted }: { onPosted: () => void }) {
  const { user } = useAuth();
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [posted, setPosted] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [audioToken, setAudioToken] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const windowInfo = useMemo(() => getAudioWindowInfo(now), [now]);
  const countdownSeconds = useMemo(
    () => (windowInfo.open ? 0 : secondsUntilOpen(windowInfo.istDate)),
    [windowInfo]
  );

  const audioUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUpload = () => {
    setBlob(null);
    setDuration(0);
    setCaption("");
    setAudioToken(null);
    setProgress(0);
    setError("");
  };

  const startRecording = async () => {
    setError("");
    setPosted(false);
    if (!windowInfo.open) {
      setError("Audio tweets are allowed only between 2:00 PM and 7:00 PM IST.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => {
          const next = d + 1;
          if (next >= MAX_DURATION_SEC && timerRef.current !== null) {
            clearInterval(timerRef.current);
            mediaRecorderRef.current?.stop();
          }
          return next;
        });
      }, 1000);
    } catch {
      setError("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_BYTES) {
      setError("Audio size must not exceed 100 MB.");
      return;
    }
    setError("");
    setPosted(false);
    setBlob(file);
    const tempUrl = URL.createObjectURL(file);
    const audio = new Audio(tempUrl);
    audio.onloadedmetadata = () => {
      setDuration(Math.round(audio.duration));
      URL.revokeObjectURL(tempUrl);
    };
  };

  const sendOtp = async (openModal = true) => {
    if (!user) return;
    await axiosInstance.post("/audio/send-otp", { email: user.email });
    if (openModal) setOtpOpen(true);
  };

  const uploadWithToken = async (token: string) => {
    if (!blob || !user) return;
    setUploading(true);
    setProgress(0);
    setError("");
    setPosted(false);
    try {
      const formData = new FormData();
      formData.append("audio", blob, blob instanceof File ? blob.name : "tweet-audio.webm");
      formData.append("audioToken", token);
      formData.append("durationSeconds", String(duration));
      if (caption.trim()) formData.append("caption", caption.trim());

      await axiosInstance.post("/audio/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      setBlob(null);
      setDuration(0);
      setCaption("");
      setAudioToken(null);
      setPosted(true);
      onPosted();
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const startUploadFlow = async () => {
    if (!blob || !user) return;
    setError("");
    if (!windowInfo.open) {
      setError("Audio tweets are allowed only between 2:00 PM and 7:00 PM IST.");
      return;
    }
    if (blob.size > MAX_SIZE_BYTES) {
      setError("Audio size must not exceed 100 MB.");
      return;
    }
    if (duration > MAX_DURATION_SEC) {
      setError("Audio must not exceed 5 minutes.");
      return;
    }
    // Already verified (token still valid) → upload straight away.
    if (audioToken) {
      void uploadWithToken(audioToken);
      return;
    }
    try {
      await sendOtp(true);
    } catch (err) {
      setError(getErrorMessage(err, "Could not send verification code."));
    }
  };

  const onVerify = async (code: string) => {
    const res = await axiosInstance.post("/audio/verify-otp", { code });
    const token = res.data?.audioToken;
    if (!token) throw new Error("Verification incomplete. Please try again.");
    setAudioToken(token);
    // Modal closes after this resolves; upload runs with its own progress UI.
    void uploadWithToken(token);
  };

  const onResend = async () => {
    try {
      await sendOtp(false);
    } catch (err) {
      throw new Error(getErrorMessage(err, "Could not resend verification code."));
    }
  };

  return (
    <div className="border border-border rounded-xl p-3 mt-2">
      <p className="text-muted-foreground text-xs mb-2">
        🎙 Audio tweets: max 5 min / 100 MB (MP3, WAV, M4A, OGG), postable 2:00–7:00 PM IST,
        requires email OTP.
      </p>
      {!windowInfo.open && (
        <p className="text-amber-500 text-xs mb-2">
          Audio tweets are currently closed. Opens in {formatCountdown(countdownSeconds)} (2:00
          PM IST).
        </p>
      )}
      <div className="flex items-center gap-2">
        {!recording ? (
          <Button
            type="button"
            variant="outline"
            onClick={startRecording}
            disabled={!windowInfo.open}
            className="rounded-full"
          >
            <Mic className="h-4 w-4 mr-1" /> Record
          </Button>
        ) : (
          <Button type="button" onClick={stopRecording} className="rounded-full bg-red-600 hover:bg-red-700">
            <Square className="h-4 w-4 mr-1" /> Stop ({duration}s)
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={!windowInfo.open}
        >
          <Upload className="h-4 w-4 mr-1" /> Upload file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.ogg,audio/*"
          hidden
          onChange={handleFilePick}
        />
      </div>

      {blob && (
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <AudioPlayer src={audioUrl || ""} />
            </div>
            <button type="button" onClick={resetUpload} aria-label="Remove audio" className="mt-1">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            maxLength={500}
            className="text-foreground"
          />
        </div>
      )}

      {uploading && (
        <div className="mt-2">
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Posting… {progress}%</p>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      {posted && (
        <p className="text-green-500 text-sm mt-2 flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4" /> Audio tweet posted!
        </p>
      )}

      {blob && (
        <Button
          type="button"
          disabled={uploading || !windowInfo.open}
          onClick={startUploadFlow}
          className="mt-3 bg-brand hover:bg-brand/90 rounded-full font-bold"
        >
          {uploading ? `Posting… ${progress}%` : "Post audio tweet"}
        </Button>
      )}

        <OtpModal
          open={otpOpen}
          title="Verify to post audio"
          description="Enter the 6-digit code sent to your registered email."
          onVerify={onVerify}
        onClose={() => setOtpOpen(false)}
        onResend={onResend}
        resendCooldownSec={60}
      />
    </div>
  );
}
