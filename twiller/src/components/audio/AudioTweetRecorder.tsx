"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload, X } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";
import OtpModal from "../otp/OtpModal";

const MAX_DURATION_SEC = 5 * 60;
const MAX_SIZE_BYTES = 100 * 1024 * 1024;

export default function AudioTweetRecorder({ onPosted }: { onPosted: () => void }) {
  const { user } = useAuth();
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    setError("");
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
          if (next >= MAX_DURATION_SEC) {
            clearInterval(timerRef.current);
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
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_BYTES) {
      setError("Audio must be under 100 MB.");
      return;
    }
    setBlob(file);
    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => setDuration(Math.round(audio.duration));
  };

  const startUploadFlow = async () => {
    if (!user) return;
    setError("");
    if (duration > MAX_DURATION_SEC) return setError("Audio must be 5 minutes or shorter.");
    try {
      await axiosInstance.post("/audio/otp/request", { email: (user as any).email });
      setOtpOpen(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not send OTP.");
    }
  };

  const confirmUpload = async (code: string) => {
    if (!blob || !user) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "tweet-audio.webm");
      formData.append("authorId", (user as any)._id);
      formData.append("email", (user as any).email);
      formData.append("code", code);
      formData.append("durationSeconds", String(duration));

      await axiosInstance.post("/audio/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBlob(null);
      setDuration(0);
      onPosted();
    } catch (err: any) {
      throw new Error(err?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-gray-800 rounded-xl p-3 mt-2">
      <p className="text-gray-400 text-xs mb-2">
        🎙 Audio tweets: max 5 min / 100 MB, only postable 2:00–7:00 PM IST, requires email OTP.
      </p>
      <div className="flex items-center gap-2">
        {!recording ? (
          <Button type="button" variant="outline" onClick={startRecording} className="rounded-full">
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
        >
          <Upload className="h-4 w-4 mr-1" /> Upload file
        </Button>
        <input ref={fileInputRef} type="file" accept="audio/*" hidden onChange={handleFilePick} />
      </div>

      {blob && audioUrl && (
        <div className="mt-3 flex items-center gap-2">
          <audio controls src={audioUrl} className="max-w-full" />
          <button onClick={() => setBlob(null)}>
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {blob && (
        <Button
          type="button"
          disabled={uploading}
          onClick={startUploadFlow}
          className="mt-3 bg-blue-500 hover:bg-blue-600 rounded-full font-bold"
        >
          {uploading ? "Posting..." : "Post audio tweet"}
        </Button>
      )}

      <OtpModal
        open={otpOpen}
        title="Verify to post audio"
        description="Enter the code sent to your registered email."
        onVerify={confirmUpload}
        onClose={() => setOtpOpen(false)}
      />
    </div>
  );
}
