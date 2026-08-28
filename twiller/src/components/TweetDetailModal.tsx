"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Share,
  X,
  BadgeCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Skeleton } from "./ui/skeleton";
import AudioPlayer from "./audio/AudioPlayer";
import ImageFallback from "./ui/ImageFallback";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";
import { AnimatePresence, motion } from "@/lib/motion";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { formatNumber, fullDate, timeAgo } from "@/lib/format";
import { useToast } from "./Toast";
import { getErrorMessage, type Tweet, type TweetReply } from "@/lib/types";

interface TweetDetailModalProps {
  tweetId: string | null;
  onClose: () => void;
  onTweetUpdated?: (tweet: Tweet) => void;
}

export default function TweetDetailModal({
  tweetId,
  onClose,
  onTweetUpdated,
}: TweetDetailModalProps) {
  const { user } = useAuth();
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const [posting, setPosting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  // Reset the image fallback whenever the modal targets a different tweet
  // (guarded "adjust state during render" pattern — no effect involved).
  const [imageResetKey, setImageResetKey] = useState<string | null>(null);
  if (tweetId !== imageResetKey) {
    setImageResetKey(tweetId);
    setImageFailed(false);
  }

  const { toast } = useToast();
  const loading = tweetId !== null && tweetId !== loadedId;

  useEffect(() => {
    if (!tweetId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosInstance.get(`/tweet/${tweetId}`);
        if (!cancelled) {
          setTweet(res.data);
          setLoadedId(tweetId);
        }
      } catch {
        if (!cancelled) {
          setTweet(null);
          setLoadedId(tweetId);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tweetId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useLockBodyScroll(tweetId !== null);

  const isLiked = !!user && tweet?.likedBy?.includes(user._id);
  const isRetweet = !!user && tweet?.retweetedBy?.includes(user._id);

  const handleLike = async () => {
    if (!tweet || !user) return;
    setActionLoading(true);
    try {
      const res = await axiosInstance.post(`/like/${tweet._id}`, {
        userId: user._id,
      });
      setTweet(res.data);
      onTweetUpdated?.(res.data);
    } catch (error) {
      toast("Failed to like tweet", "error", getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetweet = async () => {
    if (!tweet || !user) return;
    setActionLoading(true);
    try {
      const res = await axiosInstance.post(`/retweet/${tweet._id}`, {
        userId: user._id,
      });
      setTweet(res.data);
      onTweetUpdated?.(res.data);
    } catch (error) {
      toast("Failed to retweet", "error", getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    if (!tweet) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Twiller", text: tweet.content });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast("Link copied to clipboard", "success");
      }
    } catch {
      toast("Failed to copy link", "error");
    }
  };

  const handleReply = async () => {
    if (!user || !tweet || !reply.trim() || posting) return;
    setPosting(true);
    try {
      const res = await axiosInstance.post(`/tweet/${tweet._id}/reply`, {
        userId: user._id,
        content: reply,
      });
      setTweet(res.data);
      setReply("");
      onTweetUpdated?.(res.data);
    } catch (error) {
      toast("Failed to post reply", "error", getErrorMessage(error));
    } finally {
      setPosting(false);
    }
  };

  const author = tweet?.author;

  const audioDuration = tweet?.audioDurationSeconds ?? 0;
  const audioSize = tweet?.audioSizeBytes ?? 0;

  const actionClass = (active: boolean, color: "blue" | "green" | "red") => {
    const base = "flex items-center gap-2 p-2 rounded-full transition-colors disabled:opacity-50";
    if (color === "blue") return `${base} text-muted-foreground hover:text-brand hover:bg-brand/10`;
    if (color === "green")
      return `${base} ${active ? "text-emerald-500" : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"}`;
    return `${base} ${active ? "text-red-500" : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"}`;
  };

  return (
    <AnimatePresence>
      {tweetId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Post details"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-xl max-h-full h-full sm:h-auto sm:max-h-[85vh] bg-card border border-border rounded-none sm:rounded-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-foreground"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
              <h2 className="font-bold text-lg text-foreground">Post</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ) : !tweet || !author ? (
                <div className="p-8 text-center text-muted-foreground">
                  This post could not be loaded.
                </div>
              ) : (
                <>
                  {/* Tweet body */}
                  <div className="px-4 pt-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={author.avatar} alt={author.displayName} />
                        <AvatarFallback>{author.displayName?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-foreground">
                            {author.displayName || "Unknown User"}
                          </span>
                          {author.verified && (
                            <BadgeCheck className="h-4 w-4 text-brand shrink-0" />
                          )}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          @{author.username || "unknown"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 rounded-full text-muted-foreground"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </div>

                    {tweet.content && (
                      <p className="text-foreground text-xl leading-relaxed mt-4 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {tweet.content}
                      </p>
                    )}

                    {tweet.image && (
                      <div className="relative mt-3 aspect-[3/2] w-full overflow-hidden rounded-2xl border border-border bg-muted/40">
                        {imageFailed ? (
                          <ImageFallback />
                        ) : (
                          <Image
                            src={tweet.image}
                            alt=""
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 100vw, 600px"
                            loading="lazy"
                            onError={() => {
                              console.warn("[tweet-image] failed to load:", tweet.image);
                              setImageFailed(true);
                            }}
                            className="object-cover"
                          />
                        )}
                      </div>
                    )}

                    {tweet.type === "audio" && tweet.audioUrl && (
                      <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-3">
                        <AudioPlayer src={tweet.audioUrl} />
                        {(audioDuration > 0 || audioSize > 0) && (
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1.5">
                            {audioDuration > 0 && (
                              <span>
                                {Math.floor(audioDuration / 60)}:
                                {String(Math.round(audioDuration % 60)).padStart(2, "0")}
                              </span>
                            )}
                            {audioSize > 0 && <span>{(audioSize / (1024 * 1024)).toFixed(1)} MB</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {tweet.timestamp && (
                      <p className="text-muted-foreground text-sm mt-3">
                        {fullDate(tweet.timestamp)}
                      </p>
                    )}

                    <div className="flex items-center justify-between max-w-md mt-4 py-1">
                      <button
                        className={actionClass(false, "blue")}
                        onClick={() => replyInputRef.current?.focus()}
                        aria-label="Focus reply box"
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-sm">
                          {formatNumber(tweet.comments ?? 0)}
                        </span>
                      </button>

                      <button
                        className={actionClass(!!isRetweet, "green")}
                        onClick={handleRetweet}
                        disabled={actionLoading}
                      >
                        <Repeat2 className="h-5 w-5" />
                        <span className="text-sm">
                          {formatNumber(tweet.retweets ?? 0)}
                        </span>
                      </button>

                      <button
                        className={actionClass(!!isLiked, "red")}
                        onClick={handleLike}
                        disabled={actionLoading}
                      >
                        <Heart
                          className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`}
                        />
                        <span className="text-sm">
                          {formatNumber(tweet.likes ?? 0)}
                        </span>
                      </button>

                      <button
                        className={actionClass(false, "blue")}
                        onClick={handleShare}
                      >
                        <Share className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Reply composer */}
                  <div className="flex gap-3 px-4 py-3 border-y border-border">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.avatar} alt={user?.displayName} />
                      <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        ref={replyInputRef}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Post your reply"
                        maxLength={280}
                        rows={2}
                        className="bg-transparent border-none text-foreground placeholder:text-muted-foreground resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleReply}
                          disabled={!reply.trim() || posting}
                          className="bg-brand hover:bg-brand/90 text-white font-semibold rounded-full px-5"
                        >
                          {posting ? "Posting..." : "Reply"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  <div className="divide-y divide-border">
                    {(tweet.replies || []).length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="font-bold text-foreground text-lg">
                          No replies yet
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Start the conversation.
                        </p>
                      </div>
                    ) : (
                      (tweet.replies || []).map((r: TweetReply, i: number) => (
                        <div key={r._id || i} className="flex gap-3 px-4 py-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={r.user?.avatar}
                              alt={r.user?.displayName}
                            />
                            <AvatarFallback>
                              {r.user?.displayName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-foreground text-sm">
                                {r.user?.displayName}
                              </span>
                              {r.user?.verified && (
                                <BadgeCheck className="h-4 w-4 text-brand shrink-0" />
                              )}
                              <span className="text-muted-foreground text-xs">
                                @{r.user?.username} · {timeAgo(r.timestamp)}
                              </span>
                            </div>
                            <p className="text-foreground text-sm mt-1 whitespace-pre-wrap break-words">
                              {r.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
