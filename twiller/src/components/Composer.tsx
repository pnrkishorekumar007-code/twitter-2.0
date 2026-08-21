"use client";

import { useAuth } from "@/context/AuthContext";
import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Image as ImageIcon,
  Smile,
  Mic,
  X,
  CalendarClock,
  MapPin,
} from "lucide-react";
import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";
import AudioTweetRecorder from "./audio/AudioTweetRecorder";
import { useToast } from "./Toast";
import { AnimatePresence, motion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { getErrorMessage, type Tweet } from "@/lib/types";

interface ComposerProps {
  onTweetPosted?: (tweet: Tweet) => void;
  onAudioPosted?: () => void;
}

const EMOJIS = [
  "😂", "😍", "🤝", "🔥", "❤️", "👇", "🎉", "😢", "😮", "🙏",
  "💯", "✨", "🥳", "😎", "🤯", "👏", "💪", "🚀", "🎯", "🌈",
  "🐦", "☕", "🏆", "🌍", "🧠", "📣",
];

const Composer = ({ onTweetPosted, onAudioPosted }: ComposerProps) => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageurl, setimageurl] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxLength = 200;

  useEffect(() => {
    const handler = () => {
      setShowAudio(false);
      setShowEmoji(false);
      textareaRef.current?.focus();
    };
    window.addEventListener("twiller:focus-composer", handler);
    return () => window.removeEventListener("twiller:focus-composer", handler);
  }, []);

  // Auto-expand textarea fallback for browsers without field-sizing.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    setIsLoading(true);
    try {
      const tweetdata = {
        author: user._id,
        content: content.trim(),
        image: imageurl,
      };
      const res = await axiosInstance.post("/post", tweetdata);
      onTweetPosted?.(res.data);
      setContent("");
      setimageurl("");
      await refreshUser();
      toast("Your post is live", "success");
    } catch (error) {
      await refreshUser();
      toast(
        "Couldn't post that tweet",
        "error",
        getErrorMessage(error)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_KEY?.trim();
    if (!apiKey) {
      toast(
        "Image upload isn't configured. Set NEXT_PUBLIC_IMGBB_KEY in twiller/.env.local and restart the dev server.",
        "error"
      );
      return;
    }
    setIsLoading(true);
    const formdata = new FormData();
    formdata.append("image", file);
    try {
      const res = await axios.post(
        "https://api.imgbb.com/1/upload",
        formdata,
        {
          params: { key: apiKey },
        }
      );
      // Prefer the direct image file URL (display_url). `data.url` may point
      // to imgbb's HTML viewer page, which would render as a broken image.
      const url =
        res.data?.data?.display_url ||
        res.data?.data?.image?.url ||
        res.data?.data?.url;
      if (!url) throw new Error("Image upload failed. Please try again.");
      setimageurl(url);
      setImageFailed(false);
      toast("Image attached", "success");
    } catch (error) {
      toast(
        "Image upload failed",
        "error",
        getErrorMessage(error)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart ?? content.length;
      const end = el.selectionEnd ?? content.length;
      const next = content.slice(0, start) + emoji + content.slice(end);
      setContent(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + emoji.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      setContent((c) => c + emoji);
    }
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > maxLength;
  const isNearLimit = characterCount > maxLength * 0.8;
  const remaining = maxLength - characterCount;
  const showRing = characterCount > 0;
  const showCount = remaining <= 20;

  const isUnlimited = user?.subscriptionPlan === "GOLD";
  const tweetsRemaining = user
    ? Math.max(0, (user.tweetLimit ?? 1) - (user.tweetsUsed ?? 0))
    : null;
  const limitReached = !isUnlimited && tweetsRemaining !== null && tweetsRemaining <= 0;

  const RING_RADIUS = 10;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  return (
    <div className="border-b border-border">
      <form onSubmit={handleSubmit} className="flex gap-3 px-4 py-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={user.avatar} alt={user.displayName} />
          <AvatarFallback>{user.displayName[0]}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            rows={1}
            maxLength={maxLength * 2}
            aria-label="What's happening?"
            className="min-h-[26px] w-full resize-none overflow-hidden border-0 bg-transparent py-2 text-xl leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          />

          {imageurl && (
            <div className="relative mt-2">
              {imageFailed ? (
                <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="h-6 w-6" aria-hidden="true" />
                    <span className="text-xs">Image unavailable</span>
                  </div>
                </div>
              ) : (
                <img
                  src={imageurl}
                  alt="Tweet preview"
                  loading="lazy"
                  decoding="async"
                  onError={() => setImageFailed(true)}
                  className="max-h-60 w-full rounded-2xl border border-border object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => setimageurl("")}
                className="absolute left-2 top-2 rounded-full bg-black/70 p-1.5 text-white transition-colors duration-200 hover:bg-black/90"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {showAudio && (
            <div className="mt-2">
              <AudioTweetRecorder
                onPosted={() => {
                  setShowAudio(false);
                  onAudioPosted?.();
                  toast("Audio tweet posted", "success");
                }}
              />
            </div>
          )}

          {/* Toolbar — hairline separator above, X pattern */}
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-2">
            <div className="-ml-2 flex items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                type="button"
                className="grid h-[34px] w-[34px] place-items-center rounded-full text-brand transition-colors duration-150 hover:bg-brand/10"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add image"
              >
                <ImageIcon className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={cn(
                  "grid h-[34px] w-[34px] place-items-center rounded-full text-brand transition-colors duration-150 hover:bg-brand/10",
                  showAudio && "bg-brand/10"
                )}
                onClick={() => setShowAudio((s) => !s)}
                aria-label="Record audio"
                aria-expanded={showAudio}
              >
                <Mic className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={cn(
                  "grid h-[34px] w-[34px] place-items-center rounded-full text-brand transition-colors duration-150 hover:bg-brand/10",
                  showEmoji && "bg-brand/10"
                )}
                onClick={() => setShowEmoji((s) => !s)}
                aria-label="Emoji"
                aria-expanded={showEmoji}
              >
                <Smile className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="grid h-[34px] w-[34px] place-items-center rounded-full text-brand transition-colors duration-150 hover:bg-brand/10"
                aria-label="Add GIF"
              >
                <span className="grid h-[18px] w-[21px] place-items-center rounded-[4px] border-2 border-current text-[9px] font-extrabold leading-none">
                  GIF
                </span>
              </button>
              <button
                type="button"
                className="hidden h-[34px] w-[34px] place-items-center rounded-full text-brand transition-colors duration-150 hover:bg-brand/10 sm:grid"
                aria-label="Schedule post"
              >
                <CalendarClock className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="hidden h-[34px] w-[34px] place-items-center rounded-full text-brand transition-colors duration-150 hover:bg-brand/10 sm:grid"
                aria-label="Add location"
              >
                <MapPin className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {!isUnlimited && tweetsRemaining !== null && (
                <span
                  className={cn(
                    "hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-block",
                    tweetsRemaining <= 1
                      ? "bg-[#f91880]/10 text-[#f91880]"
                      : "bg-muted text-muted-foreground"
                  )}
                  title="Monthly posting limit"
                >
                  {limitReached
                    ? "Tweet limit reached"
                    : `${tweetsRemaining} tweet${tweetsRemaining === 1 ? "" : "s"} left`}
                </span>
              )}
              {isUnlimited && (
                <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
                  Unlimited Tweets
                </span>
              )}

              {/* Circular progress — appears once the user starts typing */}
              {(showRing || isLoading) && (
                <div
                  className="flex items-center gap-1.5"
                  title={isOverLimit ? `${characterCount}/${maxLength}` : undefined}
                >
                  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] -rotate-90" aria-hidden="true">
                    <circle cx="12" cy="12" r={RING_RADIUS} fill="none" strokeWidth="2" className="stroke-border" />
                    <circle
                      cx="12"
                      cy="12"
                      r={RING_RADIUS}
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={
                        RING_CIRCUMFERENCE *
                        (1 - Math.min(characterCount / maxLength, 1))
                      }
                      className={cn(
                        "transition-[stroke-dashoffset,stroke] duration-200",
                        isOverLimit
                          ? "stroke-[#f4212e]"
                          : isNearLimit
                            ? "stroke-[#ffd400]"
                            : "stroke-brand"
                      )}
                    />
                  </svg>
                  {showCount && (
                    <span
                      className={cn(
                        "text-[13px]",
                        isOverLimit ? "text-[#f4212e]" : "text-muted-foreground"
                      )}
                    >
                      {isOverLimit ? remaining : `${remaining}`}
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!content.trim() || isLoading || isOverLimit || limitReached}
                className="h-9 rounded-full bg-brand px-4 text-[15px] font-bold text-white transition-colors duration-200 hover:bg-x-blue-hover disabled:opacity-50 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {isLoading ? "Posting..." : "Post"}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 8, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mt-3 grid grid-cols-6 gap-1 rounded-2xl border border-border bg-card p-3 sm:grid-cols-8">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => insertEmoji(e)}
                      className="grid aspect-square place-items-center rounded-full text-xl transition-colors duration-150 hover:bg-hover-overlay"
                      aria-label={`Add emoji ${e}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
};

export default Composer;
