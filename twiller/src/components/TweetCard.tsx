"use client";

import React, { memo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  Bookmark,
  MoreHorizontal,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";
import TweetDetailModal from "./TweetDetailModal";
import AudioPlayer from "./audio/AudioPlayer";
import { motion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { formatNumber, timeAgo } from "@/lib/format";
import type { Tweet } from "@/lib/types";

function ActionButton({
  label,
  active,
  activeClass,
  count,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  activeClass?: string;
  count?: number | string;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-0.5 text-muted-foreground rounded-full transition-colors duration-150",
        activeClass
      )}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full transition-colors duration-150">
        {children}
      </span>
      {count !== undefined && (
        <span className="text-[13px] transition-colors duration-150">{count}</span>
      )}
    </button>
  );
}

function TweetCardInner({ tweet }: { tweet: Tweet }) {
  const { user } = useAuth();
  const [tweetstate, settweetstate] = useState(tweet);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

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

  const isLiked = !!user && tweetstate.likedBy?.includes(user._id);
  const isRetweet = !!user && tweetstate.retweetedBy?.includes(user._id);

  const audioDuration = tweetstate.audioDurationSeconds ?? 0;
  const audioSize = tweetstate.audioSizeBytes ?? 0;

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

  if (
    !tweetstate ||
    !tweetstate.author ||
    typeof tweetstate.author === "string"
  ) {
    return null;
  }

  const openDetail = () => setDetailId(tweetstate._id);

  return (
    <>
      <article
        onClick={openDetail}
        className="group cursor-pointer border-b border-border bg-background hover:bg-accent/50 transition-colors duration-150"
      >
        <div className="p-4">
          <div className="flex space-x-3">
            <Avatar className="h-11 w-11 shrink-0 transition-shadow duration-200 group-hover:shadow-[0_0_0_1px_rgba(29,155,240,0.3)]">
              <AvatarImage
                src={tweetstate.author.avatar}
                alt={tweetstate.author.displayName}
              />
              <AvatarFallback>
                {tweetstate.author.displayName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center text-[15px] leading-5">
                <span className="font-bold text-foreground truncate max-w-[45%] hover:underline cursor-pointer">
                  {tweetstate.author.displayName || "Unknown User"}
                </span>
                {tweetstate.author.verified && (
                  <BadgeCheck
                    className="h-[18px] w-[18px] text-brand shrink-0 ml-1"
                    aria-label="Verified"
                  />
                )}
                <span className="text-muted-foreground truncate ml-1">
                  @{tweetstate.author.username || "unknown"}
                </span>
                <span className="text-muted-foreground mx-1">·</span>
                <span className="text-muted-foreground shrink-0">
                  {timeAgo(tweetstate.timestamp)}
                </span>
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-8 w-8 rounded-full hover:bg-brand/10"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="More"
                  >
                    <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {tweetstate.content && (
                <div className="text-foreground mt-0.5 leading-relaxed break-words whitespace-pre-wrap text-[15px]">
                  {tweetstate.content}
                </div>
              )}

              {tweetstate.type === "audio" && tweetstate.audioUrl && (
                <div
                  className="mt-3 rounded-2xl border border-border bg-muted/40 p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AudioPlayer src={tweetstate.audioUrl} />
                  {(audioDuration > 0 || audioSize > 0) && (
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1.5">
                      {audioDuration > 0 && (
                        <span>
                          {Math.floor(audioDuration / 60)}:
                          {String(Math.round(audioDuration % 60)).padStart(2, "0")}
                        </span>
                      )}
                      {audioSize > 0 && (
                        <span>{(audioSize / (1024 * 1024)).toFixed(1)} MB</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tweetstate.image && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-border bg-muted transition-shadow duration-200 group-hover:shadow-lg">
                  <img
                    src={tweetstate.image}
                    alt=""
                    loading="lazy"
                    className="w-full h-auto max-h-96 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
              )}

              <div className="mt-2 flex items-center justify-between max-w-md -ml-1">
                <ActionButton
                  label="Reply"
                  count={formatNumber(tweetstate.comments ?? 0)}
                  activeClass="hover:bg-brand/10 hover:text-brand [&>*:last-child]:group-hover:text-brand"
                >
                  <MessageCircle className="h-[18px] w-[18px]" />
                </ActionButton>

                <ActionButton
                  label="Repost"
                  active={isRetweet}
                  count={formatNumber(tweetstate.retweets ?? 0)}
                  activeClass={cn(
                    "hover:bg-emerald-500/10 hover:text-emerald-500",
                    isRetweet && "text-emerald-500"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    retweetTweet(tweetstate._id);
                  }}
                >
                  <Repeat2 className={cn("h-[18px] w-[18px]", isRetweet && "fill-current")} />
                </ActionButton>

                <ActionButton
                  label="Like"
                  active={isLiked}
                  count={formatNumber(tweetstate.likes ?? 0)}
                  activeClass={cn(
                    "hover:bg-red-500/10 hover:text-red-500",
                    isLiked && "text-red-500"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    likeTweet(tweetstate._id);
                  }}
                >
                  <motion.span
                    key={isLiked ? "liked" : "unliked"}
                    initial={isLiked ? { scale: 0.5, rotate: -20 } : { scale: 1 }}
                    animate={isLiked ? { scale: [0.5, 1.35, 1] } : { scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="inline-flex"
                  >
                    <Heart
                      className={cn("h-[18px] w-[18px]", isLiked && "fill-current")}
                    />
                  </motion.span>
                </ActionButton>

                <ActionButton
                  label="Bookmark"
                  active={bookmarked}
                  activeClass="hover:bg-brand/10 hover:text-brand"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBookmarked((b) => !b);
                  }}
                >
                  <Bookmark
                    className={cn("h-[18px] w-[18px]", bookmarked && "fill-current text-brand")}
                  />
                </ActionButton>

                <ActionButton
                  label="Share"
                  activeClass="hover:bg-brand/10 hover:text-brand"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                >
                  <Share className="h-[18px] w-[18px]" />
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      </article>

      <TweetDetailModal
        tweetId={detailId}
        onClose={() => setDetailId(null)}
        onTweetUpdated={(updated: Tweet) => settweetstate(updated)}
      />
    </>
  );
}

const TweetCard = memo(TweetCardInner);
export default TweetCard;
