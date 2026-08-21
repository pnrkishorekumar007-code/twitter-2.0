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
import { motion } from "@/lib/motion";
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

  const fetchForYou = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/post");
      setForYouTweets(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast(t("feed_load_error"), "error", getErrorMessage(error));
    } finally {
      setLoadingForYou(false);
    }
  }, [toast, t]);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/post")
      .then((res) => {
        if (!cancelled) setForYouTweets(Array.isArray(res.data) ? res.data : []);
      })
      .catch((error) => {
        if (cancelled) return;
        toast(t("feed_load_error"), "error", getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoadingForYou(false);
      });
    return () => {
      cancelled = true;
    };
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

  const handleTabChange = (value: string) => {
    if (value === "forYou" || value === "following") {
      // Only show skeletons on the first load — cached content switches instantly.
      if (value === "following" && followingTweets.length === 0) {
        setLoadingFollowing(true);
      }
      setActiveTab(value);
    }
  };

  const handlenewtweet = (newtweet: Tweet) => {
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
  };

  const renderTweets = (list: Tweet[]) =>
    list
      .filter(
        (tweet) =>
          tweet &&
          tweet.author &&
          typeof tweet.author !== "string"
      )
      .map((tweet) => (
        <motion.div key={tweet._id} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.15 } } }}>
          <TweetCard tweet={tweet} />
        </motion.div>
      ));

  const renderEmptyState = (isFollowing: boolean) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="max-w-[380px] py-16 px-8 mx-auto text-center"
    >
      <p className="text-3xl font-extrabold text-foreground leading-9">
        {isFollowing ? t("feed_following_empty_title") : t("feed_empty_title")}
      </p>
      <p className="text-muted-foreground mt-2 text-[15px] leading-5">
        {isFollowing
          ? t("feed_empty_desc")
          : t("feed_empty_hint")}
      </p>
      {isFollowing && (
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("twiller:go-search"))
          }
          className="mt-6 h-9 rounded-full bg-brand px-4 text-[15px] font-bold text-white transition-colors duration-200 hover:bg-x-blue-hover active:scale-[0.98]"
        >
          {t("feed_find_people")}
        </button>
      )}
    </motion.div>
  );

  const isLoading =
    (activeTab === "forYou" && loadingForYou) ||
    (activeTab === "following" && loadingFollowing);

  const currentList =
    activeTab === "forYou" ? forYouTweets : followingTweets;

  return (
    <div className="min-h-dvh">
      {/* Sticky header + tabs */}
      <div className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="flex h-[53px] items-center gap-4 px-4">
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors duration-200 hover:bg-hover-overlay md:hidden outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label={t("more")}
            onClick={() => window.dispatchEvent(new CustomEvent("twiller:open-menu"))}
          >
            <Menu className="h-5 w-5 text-foreground" aria-hidden="true" />
          </button>
          <h1 className="truncate text-xl font-bold text-foreground">{t("home")}</h1>
          {user && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("twiller:go-profile"))}
              className="ml-auto shrink-0 rounded-full transition-transform duration-200 active:scale-95 md:hidden outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={t("profile")}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.displayName} />
                <AvatarFallback>{user.displayName[0]}</AvatarFallback>
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
          renderEmptyState(activeTab === "following")
        ) : (
          <motion.div
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
            initial="hidden"
            animate="visible"
          >
            {renderTweets(currentList)}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Feed;
