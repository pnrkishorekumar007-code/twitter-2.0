"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  MoreHorizontal,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";
import TweetDetailModal from "./TweetDetailModal";
import { cn } from "@/lib/utils";
import { formatNumber, timeAgo } from "@/lib/format";

export default function TweetCard({ tweet }: any) {
  const { user } = useAuth();
  const [tweetstate, settweetstate] = useState(tweet);
  const [detailId, setDetailId] = useState<string | null>(null);

  const likeTweet = async (tweetId: string) => {
    try {
      const res = await axiosInstance.post(`/like/${tweetId}`, {
        userId: user?._id,
      });
      settweetstate(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const retweetTweet = async (tweetId: string) => {
    try {
      const res = await axiosInstance.post(`/retweet/${tweetId}`, {
        userId: user?._id,
      });
      settweetstate(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const isLiked = tweetstate.likedBy?.includes(user?._id);
  const isRetweet = tweetstate.retweetedBy?.includes(user?._id);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Twiller",
          text: tweetstate.content,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch (error) {
      console.log(error);
    }
  };

  if (!tweetstate || !tweetstate.author) return null;

  const openDetail = () => setDetailId(tweetstate._id);

  return (
    <>
      <article
        onClick={openDetail}
        className="group cursor-pointer border-b border-border bg-background hover:bg-accent/40 transition-colors"
      >
        <div className="p-4">
          <div className="flex space-x-3">
            <Avatar className="h-12 w-12 shrink-0 ring-2 ring-transparent transition-shadow group-hover:ring-brand/30">
              <AvatarImage
                src={tweetstate.author.avatar}
                alt={tweetstate.author.displayName}
              />
              <AvatarFallback>{tweetstate.author.displayName[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-bold text-foreground truncate max-w-[50%] hover:underline cursor-pointer">
                  {tweetstate.author.displayName}
                </span>
                {tweetstate.author.verified && (
                  <BadgeCheck className="h-4 w-4 text-brand shrink-0" />
                )}
                <span className="text-muted-foreground truncate">
                  @{tweetstate.author.username}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground shrink-0">
                  {timeAgo(tweetstate.timestamp)}
                </span>
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 rounded-full hover:bg-accent"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {tweetstate.content && (
                <div className="text-foreground mb-3 leading-relaxed break-words whitespace-pre-wrap">
                  {tweetstate.content}
                </div>
              )}

              {tweetstate.type === "audio" && tweetstate.audioUrl && (
                <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                  <audio controls src={tweetstate.audioUrl} className="w-full" />
                </div>
              )}

              {tweetstate.image && (
                <div className="mb-3 rounded-2xl overflow-hidden border border-border group-hover:shadow-md transition-shadow">
                  <img
                    src={tweetstate.image}
                    alt="Tweet image"
                    className="w-full h-auto max-h-96 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
              )}

              <div className="flex items-center justify-between max-w-md">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 p-2 rounded-full hover:bg-brand/10 text-muted-foreground hover:text-brand group/action active:scale-90 transition-all"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm">
                    {formatNumber(tweetstate.comments)}
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex items-center space-x-2 p-2 rounded-full hover:bg-emerald-500/10 group/action active:scale-90 transition-all",
                    isRetweet
                      ? "text-emerald-500"
                      : "text-muted-foreground hover:text-emerald-500"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    retweetTweet(tweetstate._id);
                  }}
                >
                  <Repeat2
                    className={cn("h-5 w-5", isRetweet && "fill-current")}
                  />
                  <span className="text-sm">
                    {formatNumber(tweetstate.retweets)}
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex items-center space-x-2 p-2 rounded-full hover:bg-red-500/10 group/action active:scale-90 transition-all",
                    isLiked
                      ? "text-red-500"
                      : "text-muted-foreground hover:text-red-500"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    likeTweet(tweetstate._id);
                  }}
                >
                  <Heart
                    className={cn("h-5 w-5", isLiked && "fill-current")}
                  />
                  <span className="text-sm">
                    {formatNumber(tweetstate.likes)}
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 p-2 rounded-full hover:bg-brand/10 text-muted-foreground hover:text-brand group/action active:scale-90 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                >
                  <Share className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <TweetDetailModal
        tweetId={detailId}
        onClose={() => setDetailId(null)}
        onTweetUpdated={(updated: any) => settweetstate(updated)}
      />
    </>
  );
}
