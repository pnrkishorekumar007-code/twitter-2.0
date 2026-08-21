"use client";

import Image from "next/image";
import React, { memo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { MoreHorizontal, BadgeCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBookmarks } from "@/context/BookmarksContext";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "./Toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import TweetDetailModal from "./TweetDetailModal";
import TweetActions from "./feed/TweetActions";
import AudioPlayer from "./audio/AudioPlayer";
import ImageFallback from "./ui/ImageFallback";
import { timeAgo } from "@/lib/format";
import type { Tweet } from "@/lib/types";

function TweetCardInner({ tweet }: { tweet: Tweet }) {
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { toast } = useToast();
  const [tweetstate, settweetstate] = useState(tweet);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  const bookmarked = isBookmarked(tweetstate._id);

  // Author context for the "..." menu (author is guaranteed populated after
  // the guard below, but the initializer must run before any early return).
  const authorId =
    tweetstate?.author && typeof tweetstate.author !== "string"
      ? String(tweetstate.author._id)
      : undefined;
  const authorUsername =
    tweetstate?.author && typeof tweetstate.author !== "string"
      ? tweetstate.author.username
      : "";
  const [followingAuthor, setFollowingAuthor] = useState<boolean>(
    () =>
      !!user &&
      !!authorId &&
      (user.following || []).some((id) => String(id) === authorId)
  );

  const likeTweet = async (tweetId: string) => {
    try {
      const res = await axiosInstance.post(`/like/${tweetId}`, {
        userId: user?._id,
      });
      settweetstate(res.data);
    } catch {
      toast("Couldn't like this post", "error");
    }
  };

  const retweetTweet = async (tweetId: string) => {
    try {
      const res = await axiosInstance.post(`/retweet/${tweetId}`, {
        userId: user?._id,
      });
      settweetstate(res.data);
    } catch {
      toast("Couldn't repost", "error");
    }
  };

  const isLiked = !!user && tweetstate.likedBy?.includes(user._id);
  const isRetweet = !!user && tweetstate.retweetedBy?.includes(user._id);

  const audioDuration = tweetstate.audioDurationSeconds ?? 0;
  const audioSize = tweetstate.audioSizeBytes ?? 0;

  // Deterministic view estimate derived from real engagement counts.
  const views =
    (tweetstate.likes ?? 0) * 9 +
    (tweetstate.retweets ?? 0) * 13 +
    (tweetstate.comments ?? 0) * 7 +
    37;

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
        toast("Link copied to clipboard", "success");
      }
    } catch (error) {
      // User closed the native share sheet — not an error.
      if ((error as { name?: string })?.name === "AbortError") return;
      toast("Couldn't share this post", "error");
    }
  };

  const copyPostLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied to clipboard", "success");
    } catch {
      toast("Couldn't copy the link", "error");
    }
  };

  const toggleFollowAuthor = async () => {
    if (!authorId) return;
    try {
      if (followingAuthor) {
        await axiosInstance.post(`/users/unfollow/${authorId}`);
        setFollowingAuthor(false);
        toast(`Unfollowed @${authorUsername}`, "success");
      } else {
        await axiosInstance.post(`/users/follow/${authorId}`);
        setFollowingAuthor(true);
        toast(`Following @${authorUsername}`, "success");
      }
    } catch {
      toast("Action failed. Please try again.", "error");
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
        className="group cursor-pointer border-b border-border px-4 py-3 transition-colors duration-200 hover:bg-active-overlay"
      >
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage
              src={tweetstate.author.avatar}
              alt={tweetstate.author.displayName}
            />
            <AvatarFallback>
              {tweetstate.author.displayName?.[0] || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            {/* Author line */}
            <div className="flex min-w-0 items-center text-[15px] leading-5">
              <span className="min-w-0 max-w-[55%] truncate font-bold text-foreground hover:underline">
                {tweetstate.author.displayName || "Unknown User"}
              </span>
              {tweetstate.author.verified && (
                <BadgeCheck
                  className="ml-0.5 h-[18px] w-[18px] shrink-0 text-brand"
                  aria-label="Verified"
                />
              )}
              <span className="ml-1 min-w-0 truncate text-muted-foreground">
                @{tweetstate.author.username || "unknown"}
              </span>
              <span className="mx-1 shrink-0 text-muted-foreground" aria-hidden="true">·</span>
              <span className="shrink-0 whitespace-nowrap text-muted-foreground hover:underline">
                {timeAgo(tweetstate.timestamp)}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-auto grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-brand/10 hover:text-brand"
                    aria-label="More"
                    aria-haspopup="menu"
                  >
                    <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[240px] rounded-2xl border-border bg-popover p-2">
                  <DropdownMenuItem
                    className="rounded-full px-4 py-3 text-[15px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      void copyPostLink();
                    }}
                  >
                    Copy link to post
                  </DropdownMenuItem>
                  {user && String(user._id) !== authorId && (
                    <DropdownMenuItem
                      className="rounded-full px-4 py-3 text-[15px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleFollowAuthor();
                      }}
                    >
                      {followingAuthor
                        ? `Unfollow @${authorUsername}`
                        : `Follow @${authorUsername}`}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Text content */}
            {tweetstate.content && (
              <div className="mt-0.5 break-words whitespace-pre-wrap text-[15px] leading-normal text-foreground [overflow-wrap:anywhere]">
                {tweetstate.content}
              </div>
            )}

            {/* Audio attachment */}
            {tweetstate.type === "audio" && tweetstate.audioUrl && (
              <div
                className="mt-3 rounded-2xl border border-border bg-card p-3"
                onClick={(e) => e.stopPropagation()}
              >
                <AudioPlayer src={tweetstate.audioUrl} />
                {(audioDuration > 0 || audioSize > 0) && (
                  <div className="mt-1.5 flex gap-3 text-[13px] text-muted-foreground">
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

            {/* Media — 16:9, rounded 16px, never overflows */}
            {tweetstate.image && (
              <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted">
                {imageFailed ? (
                  <ImageFallback />
                ) : (
                  <Image
                    src={tweetstate.image}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 600px"
                    loading="lazy"
                    onError={() => {
                      console.warn("[tweet-image] failed to load:", tweetstate.image);
                      setImageFailed(true);
                    }}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            )}

            {/* Engagement row */}
            <TweetActions
              comments={tweetstate.comments ?? 0}
              retweets={tweetstate.retweets ?? 0}
              likes={tweetstate.likes ?? 0}
              views={views}
              isLiked={isLiked}
              isRetweet={isRetweet}
              isBookmarked={bookmarked}
              onLike={(e) => {
                e.stopPropagation();
                likeTweet(tweetstate._id);
              }}
              onRepost={(e) => {
                e.stopPropagation();
                retweetTweet(tweetstate._id);
              }}
              onBookmark={(e) => {
                e.stopPropagation();
                toggleBookmark(tweetstate._id);
              }}
              onShare={(e) => {
                e.stopPropagation();
                handleShare();
              }}
            />
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
