"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import LoadingSpinner from "./loading-spinner";
import { Skeleton } from "./ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";
import { formatNumber, fullDate, timeAgo } from "@/lib/format";

interface TweetDetailModalProps {
  tweetId: string | null;
  onClose: () => void;
  onTweetUpdated?: (tweet: any) => void;
}

export default function TweetDetailModal({
  tweetId,
  onClose,
  onTweetUpdated,
}: TweetDetailModalProps) {
  const { user } = useAuth();
  const [tweet, setTweet] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTweet = useCallback(async () => {
    if (!tweetId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/tweet/${tweetId}`);
      setTweet(res.data);
    } catch {
      setTweet(null);
    } finally {
      setLoading(false);
    }
  }, [tweetId]);

  useEffect(() => {
    if (tweetId) fetchTweet();
  }, [tweetId, fetchTweet]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!tweetId) return null;

  const isLiked = tweet?.likedBy?.includes(user?._id);
  const isRetweet = tweet?.retweetedBy?.includes(user?._id);

  const handleLike = async () => {
    if (!tweet || !user) return;
    setActionLoading(true);
    try {
      const res = await axiosInstance.post(`/like/${tweet._id}`, {
        userId: user._id,
      });
      setTweet(res.data);
      onTweetUpdated?.(res.data);
    } catch {
      // ignore
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
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Twiller", text: tweet.content });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // ignore
    }
  };

  const handleReply = async () => {
    if (!user || !reply.trim() || posting) return;
    setPosting(true);
    try {
      const res = await axiosInstance.post(`/tweet/${tweet._id}/reply`, {
        userId: user._id,
        content: reply,
      });
      setTweet(res.data);
      setReply("");
      onTweetUpdated?.(res.data);
    } catch {
      // ignore
    } finally {
      setPosting(false);
    }
  };

  const author = tweet?.author;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl max-h-full h-full sm:h-auto sm:max-h-[85vh] bg-background border border-border rounded-none sm:rounded-2xl flex flex-col overflow-hidden animate-scale-in"
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
                    <AvatarFallback>{author.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-foreground">
                        {author.displayName}
                      </span>
                      {author.verified && (
                        <BadgeCheck className="h-4 w-4 text-brand shrink-0" />
                      )}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      @{author.username}
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
                  <p className="text-foreground text-xl leading-relaxed mt-4 whitespace-pre-wrap break-words">
                    {tweet.content}
                  </p>
                )}

                {tweet.image && (
                  <div className="mt-3 rounded-2xl overflow-hidden border border-border">
                    <img
                      src={tweet.image}
                      alt="Tweet image"
                      className="w-full h-auto max-h-96 object-cover"
                    />
                  </div>
                )}

                {tweet.type === "audio" && tweet.audioUrl && (
                  <div className="mt-3">
                    <audio controls src={tweet.audioUrl} className="w-full" />
                  </div>
                )}

                {tweet.timestamp && (
                  <p className="text-muted-foreground text-sm mt-3">
                    {fullDate(tweet.timestamp)}
                  </p>
                )}

                <div className="flex items-center justify-between max-w-md mt-4 py-1">
                  <button
                    className="flex items-center gap-2 p-2 rounded-full text-muted-foreground hover:text-brand transition-colors"
                    onClick={() => {}}
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span className="text-sm">
                      {formatNumber(tweet.comments)}
                    </span>
                  </button>

                  <button
                    className={`flex items-center gap-2 p-2 rounded-full transition-colors ${
                      isRetweet
                        ? "text-emerald-500"
                        : "text-muted-foreground hover:text-emerald-500"
                    }`}
                    onClick={handleRetweet}
                    disabled={actionLoading}
                  >
                    <Repeat2 className="h-5 w-5" />
                    <span className="text-sm">
                      {formatNumber(tweet.retweets)}
                    </span>
                  </button>

                  <button
                    className={`flex items-center gap-2 p-2 rounded-full transition-colors ${
                      isLiked
                        ? "text-red-500"
                        : "text-muted-foreground hover:text-red-500"
                    }`}
                    onClick={handleLike}
                    disabled={actionLoading}
                  >
                    <Heart
                      className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`}
                    />
                    <span className="text-sm">
                      {formatNumber(tweet.likes)}
                    </span>
                  </button>

                  <button
                    className="flex items-center gap-2 p-2 rounded-full text-muted-foreground hover:text-brand transition-colors"
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
                  (tweet.replies || []).map((r: any, i: number) => (
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
        {loading && (
          <div className="flex justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}
