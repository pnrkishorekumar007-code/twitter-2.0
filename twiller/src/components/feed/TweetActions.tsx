"use client";

import React from "react";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  Bookmark,
  BarChart2,
} from "lucide-react";
import { motion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

/* Official X engagement colors — static classes so Tailwind compiles them */
const REPLY = {
  hover: "group-hover/reply:bg-[#1d9bf0]/10 group-hover/reply:text-[#1d9bf0]",
  active: "text-[#1d9bf0]",
};
const REPOST = {
  hover: "group-hover/repost:bg-[#00ba7c]/10 group-hover/repost:text-[#00ba7c]",
  active: "text-[#00ba7c]",
};
const LIKE = {
  hover: "group-hover/like:bg-[#f91880]/10 group-hover/like:text-[#f91880]",
  active: "text-[#f91880]",
};

function Action({
  label,
  groupName,
  active,
  colors,
  count,
  onClick,
  children,
}: {
  label: string;
  /** Named group for per-action hover styling. */
  groupName: string;
  active?: boolean;
  colors: { hover: string; active: string };
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
        `group/${groupName} -ml-2 flex items-center text-muted-foreground transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand`,
        colors.hover,
        active && colors.active
      )}
    >
      <span className="grid h-[34px] w-[34px] place-items-center rounded-full transition-colors duration-150">
        {children}
      </span>
      {count !== undefined && count !== null && (
        <span className="min-w-6 px-0.5 text-left text-[13px] tabular-nums transition-colors duration-150">
          {count}
        </span>
      )}
    </button>
  );
}

export interface TweetActionsProps {
  comments: number;
  retweets: number;
  likes: number;
  /** Deterministic view estimate derived from engagement. */
  views: number;
  isLiked?: boolean;
  isRetweet?: boolean;
  isBookmarked?: boolean;
  onLike?: (e: React.MouseEvent) => void;
  onRepost?: (e: React.MouseEvent) => void;
  onBookmark?: (e: React.MouseEvent) => void;
  onShare?: (e: React.MouseEvent) => void;
}

/**
 * TweetActions — the engagement row under every post
 * (Reply · Repost · Like · Views · Bookmark · Share), animated like X.
 */
export default function TweetActions({
  comments,
  retweets,
  likes,
  views,
  isLiked,
  isRetweet,
  isBookmarked,
  onLike,
  onRepost,
  onBookmark,
  onShare,
}: TweetActionsProps) {
  return (
    <div className="-ml-2 mt-1 flex max-w-md items-center justify-between">
      <Action
        label="Reply"
        groupName="reply"
        count={formatNumber(comments)}
        colors={REPLY}
      >
        <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
      </Action>

      <Action
        label="Repost"
        groupName="repost"
        active={isRetweet}
        count={formatNumber(retweets)}
        colors={REPOST}
        onClick={onRepost}
      >
        <Repeat2
          className={cn("h-[18px] w-[18px]", isRetweet && "fill-current")}
          aria-hidden="true"
        />
      </Action>

      <Action
        label="Like"
        groupName="like"
        active={isLiked}
        count={formatNumber(likes)}
        colors={LIKE}
        onClick={onLike}
      >
        <motion.span
          key={isLiked ? "liked" : "unliked"}
          initial={isLiked ? { scale: 0.4 } : false}
          animate={isLiked ? { scale: [0.4, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="inline-flex"
        >
          <Heart
            className={cn("h-[18px] w-[18px]", isLiked && "fill-current")}
            aria-hidden="true"
          />
        </motion.span>
      </Action>

      <Action label="Views" groupName="views" count={formatNumber(views)} colors={REPLY}>
        <BarChart2 className="h-[18px] w-[18px]" aria-hidden="true" />
      </Action>

      <div className="flex items-center">
        <Action
          label="Bookmark"
          groupName="bookmark"
          active={isBookmarked}
          colors={REPLY}
          onClick={onBookmark}
        >
          <Bookmark
            className={cn(
              "h-[18px] w-[18px]",
              isBookmarked && "fill-current text-[#1d9bf0]"
            )}
            aria-hidden="true"
          />
        </Action>

        <Action label="Share" groupName="share" colors={REPLY} onClick={onShare}>
          <Share className="h-[18px] w-[18px]" aria-hidden="true" />
        </Action>
      </div>
    </div>
  );
}
