"use client";

import { useAuth } from "@/context/AuthContext";
import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import {
  Image as ImageIcon,
  Smile,
  Calendar,
  MapPin,
  BarChart3,
  Globe,
  Mic,
  X,
} from "lucide-react";
import { Separator } from "./ui/separator";
import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";
import AudioTweetRecorder from "./audio/AudioTweetRecorder";
import { useToast } from "./Toast";
import { AnimatePresence, motion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { getErrorMessage, type Tweet } from "@/lib/types";

interface TweetComposerProps {
  onTweetPosted?: (tweet: Tweet) => void;
  onAudioPosted?: () => void;
}

const EMOJIS = [
  "😂", "😍", "🤔", "🔥", "❤️", "👍", "🎉", "😢", "😮", "🙏",
  "💯", "✨", "🥳", "😎", "🤯", "👏", "💪", "🚀", "🎯", "🌈",
  "🐦", "☕", "🏆", "🌍", "🧠", "📣",
];

const TweetComposer = ({ onTweetPosted, onAudioPosted }: TweetComposerProps) => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageurl, setimageurl] = useState("");
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
      setimageurl(res.data.data.url);
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

  const isUnlimited = user?.subscriptionPlan === "GOLD";
  const tweetsRemaining = user
    ? Math.max(0, (user.tweetLimit ?? 1) - (user.tweetsUsed ?? 0))
    : null;
  const limitReached = !isUnlimited && tweetsRemaining !== null && tweetsRemaining <= 0;

  const iconClass =
    "grid h-9 w-9 place-items-center rounded-full text-brand hover:bg-brand/10 transition-colors";
  const mutedIconClass =
    "grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent transition-colors";

  return (
    <div className="border-b border-border">
      <form onSubmit={handleSubmit} className="flex gap-3 p-4">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarImage src={user.avatar} alt={user.displayName} />
          <AvatarFallback>{user.displayName[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            rows={1}
            maxLength={maxLength}
            className="bg-transparent border-none focus-visible:ring-0 resize-none text-xl leading-snug placeholder:text-muted-foreground px-0 py-2 min-h-[48px]"
          />

          {imageurl && (
            <div className="relative mt-2">
              <img
                src={imageurl}
                alt="Tweet preview"
                className="rounded-2xl border border-border max-h-60 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setimageurl("")}
                className="absolute top-2 left-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-black/90 transition-colors"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
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

          <Separator className="my-3 bg-border" />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                type="button"
                className={iconClass}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add image"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                className={cn(iconClass, showAudio && "bg-brand/10")}
                onClick={() => setShowAudio((s) => !s)}
                aria-label="Record audio"
              >
                <Mic className="h-5 w-5" />
              </button>
              <button
                type="button"
                className={cn(mutedIconClass, showEmoji && "bg-accent")}
                onClick={() => setShowEmoji((s) => !s)}
                aria-label="Emoji"
                aria-expanded={showEmoji}
              >
                <Smile className="h-5 w-5" />
              </button>
              <button type="button" className={mutedIconClass} aria-label="Schedule">
                <Calendar className="h-5 w-5" />
              </button>
              <button type="button" className={mutedIconClass} aria-label="Analytics">
                <BarChart3 className="h-5 w-5" />
              </button>
              <button type="button" className={mutedIconClass} aria-label="Location">
                <MapPin className="h-5 w-5" />
              </button>
              <button type="button" className={mutedIconClass} aria-label="Audience">
                <Globe className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {!isUnlimited && tweetsRemaining !== null && (
                <span
                  className={cn(
                    "hidden sm:inline-block text-xs font-medium rounded-full px-2.5 py-1",
                    tweetsRemaining <= 1
                      ? "bg-amber-500/10 text-amber-500"
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
                <span className="hidden sm:inline text-xs font-medium text-muted-foreground">
                  Unlimited Tweets
                </span>
              )}
              {(isOverLimit || isNearLimit) && (
                <div className="relative h-8 w-8" title={`${characterCount}/${maxLength}`}>
                  <svg viewBox="0 0 24 24" className="h-8 w-8 -rotate-90">
                    <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2" className="stroke-border" />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 9}
                      strokeDashoffset={2 * Math.PI * 9 * (1 - Math.min(characterCount / maxLength, 1))}
                      className={cn(
                        "transition-[stroke-dashoffset,stroke] duration-200",
                        isOverLimit ? "stroke-red-500" : "stroke-brand"
                      )}
                    />
                  </svg>
                </div>
              )}
              <Button
                type="submit"
                disabled={!content.trim() || isLoading || isOverLimit || limitReached}
                className="rounded-full bg-brand-gradient animate-gradient text-white font-bold px-5 lg:px-6 shadow-lg shadow-brand/30 hover:brightness-110 transition-all"
              >
                {isLoading ? "Posting..." : "Post"}
              </Button>
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
                <div className="mt-3 grid grid-cols-8 gap-1 rounded-2xl border border-border bg-popover p-3">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => insertEmoji(e)}
                      className="grid h-9 w-9 place-items-center rounded-full text-xl hover:bg-accent transition-colors"
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

export default TweetComposer;
