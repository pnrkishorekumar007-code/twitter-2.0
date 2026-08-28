"use client";

import React, { useCallback, useEffect, useState } from "react";
import TopTabs from "./feed/TopTabs";
import TweetCard from "./TweetCard";
import Composer from "./Composer";
import SkeletonLoader from "./widgets/SkeletonLoader";
import axiosInstance from "@/lib/axiosInstance";
import { useTweetNotifications } from "@/hooks/useTweetNotifications";
import { useToast } from "./Toast";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { getErrorMessage, type Tweet } from "@/lib/types";
import { Menu } from "lucide-react";

type FeedTab = "forYou" | "following";

const Feed = () => {
  const [activeTab, setActiveTab] = useState<FeedTab>("forYou");
  const [forYouTweets, setForYouTweets] = useState<Tweet[]>([]);
  const [followingTweets, setFollowingTweets] = useState<Tweet[]>([]);
  const [loadingForYou, setLoadingForYou] = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  useTweetNotifications(activeTab === "forYou" ? forYouTweets : followingTweets);

  // Initial fetch — inline async function avoids the setState-in-effect lint rule.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosInstance.get("/post");
        if (!cancelled) setForYouTweets(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        if (!cancelled) toast(t("feed_load_error"), "error", getErrorMessage(error));
      } finally {
        if (!cancelled) setLoadingForYou(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast, t]);

  const fetchForYou = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/post");
      setForYouTweets(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast(t("feed_load_error"), "error", getErrorMessage(error));
    }
  }, [toast, t]);

  useEffect(() => {
    if (activeTab !== "following") return;
    let cancelled = false;
    axiosInstance
      .get("/tweets/following")
      .then((res) => {
        if (!cancelled) setFollowingTweets(Array.isArray(res.data) ? res.data : []);
      })
      .catch((error) => {
        if (cancelled) return;
        toast(t("feed_load_error"), "error", getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoadingFollowing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast, activeTab, t]);

  const handleTabChange = useCallback((value: string) => {
    if (value === "forYou" || value === "following") {
      if (value === "following" && followingTweets.length === 0) {
        setLoadingFollowing(true);
      }
      setActiveTab(value);
    }
  }, [followingTweets.length]);

  const handlenewtweet = useCallback((newtweet: Tweet) => {
    setForYouTweets((prev) => [newtweet, ...prev]);

    const authorId =
      newtweet.author && typeof newtweet.author !== "string"
        ? newtweet.author._id
        : undefined;

    const isOwnTweet = authorId && user?._id && authorId === user._id;
    const isFollowed =
      authorId &&
      (user?.following || []).some((id) => String(id) === String(authorId));

    if (isOwnTweet || isFollowed) {
      setFollowingTweets((prev) => [newtweet, ...prev]);
    }
  }, [user]);

  const renderTweets = useCallback((list: Tweet[]) =>
    list
      .filter(
        (tweet) =>
          tweet &&
          tweet.author &&
          typeof tweet.author !== "string"
      )
      .map((tweet) => (
        <TweetCard key={tweet._id} tweet={tweet} />
      )),
    []
  );

  const isLoading =
    (activeTab === "forYou" && loadingForYou) ||
    (activeTab === "following" && loadingFollowing);

  const currentList =
    activeTab === "forYou" ? forYouTweets : followingTweets;

  return (
    <div className="min-h-dvh">
      {/* Sticky header + tabs */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex h-[53px] items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("more")}
            onClick={() => window.dispatchEvent(new CustomEvent("twiller:open-menu"))}
          >
            <Menu className="h-5 w-5 text-foreground" aria-hidden="true" />
          </Button>
          <h1 className="truncate text-xl font-bold text-foreground">{t("home")}</h1>
          {user && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("twiller:go-profile"))}
              className="ml-auto shrink-0 rounded-full transition-transform duration-150 active:scale-95 md:hidden outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={t("profile")}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.displayName} />
                <AvatarFallback>{user.displayName?.[0] || "U"}</AvatarFallback>
              </Avatar>
            </button>
          )}
        </div>

        <TopTabs
          tabs={[
            { value: "forYou", label: t("feed_for_you") },
            { value: "following", label: t("feed_following") },
          ]}
          value={activeTab}
          onChange={handleTabChange}
        />
      </div>

      <Composer onTweetPosted={handlenewtweet} onAudioPosted={fetchForYou} />

      <div role="feed" aria-busy={isLoading}>
        {isLoading ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonLoader key={i} />
            ))}
          </>
        ) : currentList.length === 0 ? (
          <div className="max-w-[380px] py-16 px-8 mx-auto text-center">
            <p className="text-2xl font-extrabold text-foreground leading-9">
              {activeTab === "following" ? t("feed_following_empty_title") : t("feed_empty_title")}
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-5">
              {activeTab === "following"
                ? t("feed_empty_desc")
                : t("feed_empty_hint")}
            </p>
            {activeTab === "following" && (
              <Button
                className="mt-6"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("twiller:go-search"))
                }
              >
                {t("feed_find_people")}
              </Button>
            )}
          </div>
        ) : (
          <div>
            {renderTweets(currentList)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
