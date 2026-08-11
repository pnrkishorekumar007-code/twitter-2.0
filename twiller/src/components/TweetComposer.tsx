"use client";

import { useAuth } from "@/context/AuthContext";
import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import {
  Image,
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
import { cn } from "@/lib/utils";

const TweetComposer = ({ onTweetPosted, onAudioPosted }: any) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageurl, setimageurl] = useState("");
  const [showAudio, setShowAudio] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxLength = 200;

  useEffect(() => {
    const handler = () => {
      setShowAudio(false);
      textareaRef.current?.focus();
    };
    window.addEventListener("twiller:focus-composer", handler);
    return () => window.removeEventListener("twiller:focus-composer", handler);
  }, []);

  if (!user) return null;

  const handleSubmit = async (e: any) => {
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
      toast("Your post is live", "success");
    } catch (error: any) {
      toast(
        "Couldn't post that tweet",
        "error",
        error?.response?.data?.error || error.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const formdata = new FormData();
    formdata.append("image", file);
    try {
      const res = await axios.post(
        "https://api.imgbb.com/1/upload",
        formdata,
        {
          params: {
            key: process.env.NEXT_PUBLIC_IMGBB_KEY || "9d4*****",
          },
        }
      );
      setimageurl(res.data.data.url);
      toast("Image attached", "success");
    } catch {
      toast("Image upload failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > maxLength;
  const isNearLimit = characterCount > maxLength * 0.8;

  const iconClass =
    "p-2 rounded-full text-brand hover:bg-accent transition-colors";
  const mutedIconClass =
    "p-2 rounded-full text-muted-foreground hover:bg-accent transition-colors";

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
            rows={2}
            maxLength={maxLength}
            className="bg-transparent border-none focus-visible:ring-0 resize-none text-lg placeholder:text-muted-foreground"
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
                className="absolute top-2 left-2 bg-black/70 text-white rounded-full p-1.5"
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

          <Separator className="my-2 bg-border" />

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-0.5">
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
                <Image className="h-5 w-5" />
              </button>
              <button
                type="button"
                className={cn(iconClass, showAudio && "bg-accent")}
                onClick={() => setShowAudio((s) => !s)}
                aria-label="Record audio"
              >
                <Mic className="h-5 w-5" />
              </button>
              <button type="button" className={mutedIconClass} aria-label="Emoji">
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

            <div className="flex items-center gap-3">
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
                disabled={!content.trim() || isLoading || isOverLimit}
                className="rounded-full bg-brand-gradient animate-gradient text-white font-semibold px-6 shadow-lg shadow-brand/30 hover:brightness-110 hover:-translate-y-0.5 transition-all"
              >
                {isLoading ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TweetComposer;
