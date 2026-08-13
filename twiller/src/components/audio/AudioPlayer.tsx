"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface AudioPlayerProps {
  src: string;
  className?: string;
  compact?: boolean;
}

// Custom audio player: play/pause, draggable seek bar, current time / duration.
// Replaces the native <audio controls> everywhere audio tweets render.
export default function AudioPlayer({ src, className = "", compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);

  // Reset the player UI when the track changes. This "adjusting state during
  // render" pattern keeps the reset in sync with the new src in one pass.
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }

  // Only the DOM element needs a reload when the source changes.
  useEffect(() => {
    audioRef.current?.load();
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-xl bg-muted/80 border border-border p-3 ${
        compact ? "max-w-xs" : "w-full"
      } ${className}`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => !seeking && setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => setPlaying(false)}
      />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause audio" : "Play audio"}
        className="shrink-0 h-9 w-9 rounded-full bg-brand hover:bg-brand/90 text-white flex items-center justify-center transition-colors"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => handleSeek(Number(e.target.value))}
          onPointerDown={() => setSeeking(true)}
          onPointerUp={() => setSeeking(false)}
          aria-label="Seek"
          className="w-full h-1.5 appearance-none rounded-full bg-border outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
